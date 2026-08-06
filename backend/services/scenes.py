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


DATA_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "scenes.json"))

MAX_SCENES = 40
MAX_STEPS = 20
MAX_NAME = 40
MAX_DELAY = 2000

# Writes come from the phone and reads from the socket thread.
_lock = threading.Lock()


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


def run_scene(scene_id):
    scenes = get_scenes()
    found = [scene for scene in scenes if scene.get("id") == scene_id]

    if not found:
        return {"error": "Unknown scene"}, 404

    scene = found[0]

    for position, step in enumerate(scene.get("steps") or []):
        if step.get("delay") is not None and not step.get("app"):
            time.sleep(min(int(step["delay"]), MAX_DELAY) / 1000.0)
            continue

        result = app_action(step.get("app"), step.get("command"))
        body = result[0] if isinstance(result, tuple) else result
        status = result[1] if isinstance(result, tuple) else 200

        if status >= 400 or (isinstance(body, dict) and "error" in body):
            return {
                "error": body.get("error", "Step failed"),
                "scene": scene.get("name"),
                "step": position + 1
            }, status if status >= 400 else 500

    return {"ran": scene.get("name"), "steps": len(scene.get("steps") or [])}
