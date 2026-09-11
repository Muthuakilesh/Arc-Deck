"""Scenes: one button that runs a sequence of app actions.

An app's actions come from apps.json, which only the PC owner edits. Scenes are
built on the phone, so nothing here may widen what the deck can do: every step
names an app and one of the actions that app already declares, and running a
scene goes back through app_action, which checks that allowlist again. The worst
a scene can be is a rearrangement of buttons the deck already had.
"""

import json
import os
import tempfile
import threading
import time
import uuid


from .launcher import app_action, declares, find_app
from .activity import get_events, record_event
from .processes import is_running, process_name_for
from .volume import get_sessions, set_mute, set_session_mute, set_session_volume, set_volume


DATA_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "scenes.json"))

MAX_SCENES = 40
MAX_STEPS = 20
MAX_NAME = 40
MAX_DELAY = 2000
MAX_WAIT = 15000

# Writes come from the phone and reads from the socket thread.
_lock = threading.Lock()
_run_lock = threading.Lock()
_runs = {}
_cancel = {}
MAX_RUNS = 100


class SceneError(ValueError):
    """A scene the phone sent cannot be stored."""


def _read():
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as handle:
            data = json.load(handle)
    except (OSError, ValueError):
        return []

    return data if isinstance(data, list) else []


def _write(scenes):
    # Written whole: a half-saved file would lose every scene, not just the edit.
    directory = os.path.dirname(DATA_FILE)
    handle, temporary = tempfile.mkstemp(dir=directory, suffix=".tmp")

    try:
        with os.fdopen(handle, "w", encoding="utf-8") as file:
            json.dump(scenes, file, indent=2, ensure_ascii=False)

        os.replace(temporary, DATA_FILE)
    except OSError:
        if os.path.exists(temporary):
            os.remove(temporary)
        raise


def get_scenes():
    with _lock:
        return _read()


def _clean_step(step):
    if not isinstance(step, dict):
        raise SceneError("A step must be an object")

    step_type = str(step.get("type") or "").strip().lower()

    if step_type == "focus_timer":
        try:
            seconds = int(step.get("seconds"))
        except (TypeError, ValueError):
            raise SceneError("A focus timer wants seconds")
        return {"type": "focus_timer", "seconds": max(60, min(seconds, 4 * 60 * 60)), "label": str(step.get("label") or "Focus")[:MAX_NAME]}

    if step_type == "audio_master":
        cleaned = {"type": "audio_master"}
        if step.get("volume") is not None:
            try:
                cleaned["volume"] = max(0, min(100, int(step.get("volume"))))
            except (TypeError, ValueError):
                raise SceneError("Master volume must be a number")
        if step.get("muted") is not None:
            cleaned["muted"] = bool(step.get("muted"))
        if len(cleaned) == 1:
            raise SceneError("Master audio needs a volume or mute state")
        return cleaned

    if step_type in ("wait_for_app", "audio_app"):
        app = find_app(step.get("app"))
        if app is None:
            raise SceneError("Unknown app: {0}".format(step.get("app")))
        if step_type == "wait_for_app":
            try:
                timeout = int(step.get("timeout") or 5000)
            except (TypeError, ValueError):
                raise SceneError("Wait timeout must be milliseconds")
            return {
                "type": step_type,
                "app": app.get("name"),
                "timeout": max(500, min(timeout, MAX_WAIT)),
            }
        cleaned = {"type": step_type, "app": app.get("name"), "missing": "skip" if step.get("missing") == "skip" else "fail"}
        if step.get("volume") is not None:
            try:
                cleaned["volume"] = max(0, min(100, int(step.get("volume"))))
            except (TypeError, ValueError):
                raise SceneError("App volume must be a number")
        if step.get("muted") is not None:
            cleaned["muted"] = bool(step.get("muted"))
        if "volume" not in cleaned and "muted" not in cleaned:
            raise SceneError("App audio needs a volume or mute state")
        return cleaned

    if "delay" in step and not step.get("app"):
        try:
            delay = int(step.get("delay"))
        except (TypeError, ValueError):
            raise SceneError("A delay wants milliseconds")

        return {"delay": max(0, min(delay, MAX_DELAY))}

    app = find_app(step.get("app"))

    if app is None:
        raise SceneError("Unknown app: {0}".format(step.get("app")))

    command = step.get("command")

    if not declares(app, command):
        raise SceneError("{0} does not offer that action".format(app.get("name")))

    return {
        "app": app.get("name"),
        "command": command,
        "label": str(step.get("label") or "")[:MAX_NAME]
    }


def _clean(scene):
    if not isinstance(scene, dict):
        raise SceneError("A scene must be an object")

    name = str(scene.get("name") or "").strip()

    if not name:
        raise SceneError("A scene needs a name")

    steps = scene.get("steps")

    if not isinstance(steps, list) or not steps:
        raise SceneError("A scene needs at least one step")

    if len(steps) > MAX_STEPS:
        raise SceneError("A scene can hold {0} steps".format(MAX_STEPS))

    return {
        "version": 2,
        "id": str(scene.get("id") or uuid.uuid4().hex[:8]),
        "name": name[:MAX_NAME],
        "icon": str(scene.get("icon") or "\u2726")[:4],
        "pinned": bool(scene.get("pinned")),
        "steps": [_clean_step(step) for step in steps]
    }


def save_scene(scene):
    cleaned = _clean(scene)

    with _lock:
        scenes = _read()
        kept = [item for item in scenes if item.get("id") != cleaned["id"]]

        if len(kept) >= MAX_SCENES:
            raise SceneError("That is {0} scenes already".format(MAX_SCENES))

        # An edit keeps its place in the list instead of jumping to the end.
        index = next(
            (position for position, item in enumerate(scenes) if item.get("id") == cleaned["id"]),
            len(kept)
        )

        kept.insert(index, cleaned)
        _write(kept)

    return cleaned


def delete_scene(scene_id):
    with _lock:
        scenes = _read()
        kept = [item for item in scenes if item.get("id") != scene_id]

        if len(kept) == len(scenes):
            return False

        _write(kept)

    return True


def _store_run(run):
    with _run_lock:
        _runs[run["id"]] = dict(run)
        while len(_runs) > MAX_RUNS:
            oldest = next(iter(_runs))
            _runs.pop(oldest, None)
            _cancel.pop(oldest, None)


def get_run(run_id):
    with _run_lock:
        run = _runs.get(run_id)
        return dict(run) if run else None


def cancel_run(run_id):
    with _run_lock:
        run = _runs.get(run_id)
        signal = _cancel.get(run_id)
        if not run or not signal or run.get("status") not in ("running", "cancelling"):
            return False
        signal.set()
        run["status"] = "cancelling"
        _runs[run_id] = run
        return True


def get_run_history(limit=30):
    scene_types = {"scene.completed", "scene.failed", "scene.cancelled"}
    return [event for event in get_events(max(1, min(200, int(limit))) * 4) if event["type"] in scene_types][:int(limit)]


def run_scene(scene_id, run_id=None, cancel_signal=None):
    started = time.time()
    scenes = get_scenes()
    found = [scene for scene in scenes if scene.get("id") == scene_id]

    if not found:
        return {"error": "Unknown scene"}, 404

    scene = found[0]
    run_id = run_id or uuid.uuid4().hex[:12]
    cancel_signal = cancel_signal or threading.Event()
    run = {
        "id": run_id,
        "scene_id": scene_id,
        "scene": scene.get("name"),
        "status": "running",
        "step": 0,
        "steps": len(scene.get("steps") or []),
        "started_at": int(started),
    }
    with _run_lock:
        _cancel[run_id] = cancel_signal
    _store_run(run)
    record_event("scene.started", subject=scene.get("name"), action="run", source="scenes", outcome="started", context={"scene_id": scene_id, "run_id": run_id})
    directives = []

    for position, step in enumerate(scene.get("steps") or []):
        if cancel_signal.is_set():
            run.update({"status": "cancelled", "step": position, "elapsed_ms": int((time.time() - started) * 1000)})
            _store_run(run)
            record_event("scene.cancelled", subject=scene.get("name"), action="run", source="scenes", outcome="cancelled", context={"scene_id": scene_id, "run_id": run_id, "step": position})
            return {"cancelled": scene.get("name"), "run_id": run_id, "step": position, "elapsed_ms": run["elapsed_ms"]}

        run.update({"step": position + 1, "step_label": step.get("label") or ("Delay" if "delay" in step else "Action")})
        _store_run(run)
        record_event("scene.step", subject=scene.get("name"), action="step", source="scenes", outcome="started", context={"scene_id": scene_id, "run_id": run_id, "step": position + 1})

        step_type = step.get("type")

        if step_type == "focus_timer":
            directives.append({"type": "focus_timer", "seconds": step["seconds"], "label": step.get("label") or "Focus", "scene_id": scene_id})
            continue

        if step_type == "audio_master":
            try:
                if step.get("volume") is not None:
                    set_volume(step["volume"])
                if step.get("muted") is not None:
                    set_mute(step["muted"])
            except Exception as error:
                body, status = {"error": str(error)}, 503
            else:
                body, status = {"audio": "updated"}, 200
        elif step_type == "wait_for_app":
            app = find_app(step.get("app"))
            deadline = time.time() + step["timeout"] / 1000.0
            while app and not is_running(app) and time.time() < deadline and not cancel_signal.is_set():
                cancel_signal.wait(0.25)
            body, status = ({"ready": step.get("app")}, 200) if app and is_running(app) else ({"error": step.get("app") + " did not become ready"}, 408)
        elif step_type == "audio_app":
            app = find_app(step.get("app"))
            process = process_name_for(app).lower() if app else ""
            try:
                session = next((item for item in get_sessions() if str(item.get("process", "")).lower() == process), None)
            except Exception as error:
                session = None
                body, status = {"error": str(error)}, 503
            else:
                body, status = None, 200
            if body is not None:
                pass
            elif session is None and step.get("missing") == "skip":
                body, status = {"skipped": step.get("app")}, 200
            elif session is None:
                body, status = {"error": step.get("app") + " has no audio session"}, 404
            else:
                try:
                    if step.get("volume") is not None:
                        set_session_volume(session["pid"], step["volume"])
                    if step.get("muted") is not None:
                        set_session_mute(session["pid"], step["muted"])
                except Exception as error:
                    body, status = {"error": str(error)}, 503
                else:
                    body, status = {"audio": step.get("app")}, 200
        elif step.get("delay") is not None and not step.get("app"):
            cancel_signal.wait(min(int(step["delay"]), MAX_DELAY) / 1000.0)
            if cancel_signal.is_set():
                run.update({"status": "cancelled", "elapsed_ms": int((time.time() - started) * 1000)})
                _store_run(run)
                record_event("scene.cancelled", subject=scene.get("name"), action="run", source="scenes", outcome="cancelled", context={"scene_id": scene_id, "run_id": run_id, "step": position + 1})
                return {"cancelled": scene.get("name"), "run_id": run_id, "step": position + 1, "elapsed_ms": run["elapsed_ms"]}
            continue
        else:
            result = app_action(step.get("app"), step.get("command"))
            body = result[0] if isinstance(result, tuple) else result
            status = result[1] if isinstance(result, tuple) else 200

        if status >= 400 or (isinstance(body, dict) and "error" in body):
            failed = {
                "error": body.get("error", "Step failed"),
                "scene": scene.get("name"),
                "run_id": run_id,
                "step": position + 1,
                "step_label": step.get("label") or step.get("command") or "Action",
                "step_app": step.get("app") or "",
                "elapsed_ms": int((time.time() - started) * 1000)
            }
            run.update(failed)
            run["status"] = "failed"
            _store_run(run)
            record_event("scene.failed", subject=scene.get("name"), action="run", source="scenes", outcome="failed", context={"scene_id": scene_id, "run_id": run_id, "step": position + 1})
            return failed, status if status >= 400 else 500

    completed = {
        "ran": scene.get("name"),
        "run_id": run_id,
        "steps": len(scene.get("steps") or []),
        "elapsed_ms": int((time.time() - started) * 1000),
        "directives": directives,
    }
    run.update(completed)
    run["status"] = "completed"
    _store_run(run)
    record_event("scene.completed", subject=scene.get("name"), action="run", source="scenes", outcome="success", context={"scene_id": scene_id, "run_id": run_id, "duration_seconds": completed["elapsed_ms"] // 1000})
    return completed


def start_scene(scene_id):
    scenes = get_scenes()
    found = [scene for scene in scenes if scene.get("id") == scene_id]
    if not found:
        return {"error": "Unknown scene"}, 404

    run_id = uuid.uuid4().hex[:12]
    signal = threading.Event()
    run = {
        "id": run_id,
        "scene_id": scene_id,
        "scene": found[0].get("name"),
        "status": "starting",
        "step": 0,
        "steps": len(found[0].get("steps") or []),
        "started_at": int(time.time()),
    }
    with _run_lock:
        _cancel[run_id] = signal
    _store_run(run)
    worker = threading.Thread(target=run_scene, args=(scene_id, run_id, signal), daemon=True)
    worker.start()
    return {"run_id": run_id, "status": "starting", "scene": run["scene"]}
