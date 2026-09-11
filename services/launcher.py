import json
import os
import subprocess
import time

from .keyboard import press_hotkey, type_text
from .media import media_action
from .processes import is_running, process_name_for
from .window_control import close_window, focus_window


APPLICATIONS = {
    "steam": r"C:\Program Files (x86)\Steam\Steam.exe",
    "discord": r"C:\Users\%USERNAME%\AppData\Local\Discord\Update.exe",
    "vscode": r"C:\Users\%USERNAME%\AppData\Local\Programs\Microsoft VS Code\Code.exe"
}


# Discord ships a stub updater as its entry point; it only starts the client when
# told which process to launch.
LAUNCH_ARGUMENTS = {
    "discord": ["--processStart", "Discord.exe"]
}


# Every app gets these regardless of what apps.json declares.
BUILTIN_COMMANDS = ("launch", "focus", "close")

# The longest a single action may hold the request thread with delays.
MAX_STEP_DELAY = 2.0


DATA_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "apps.json")
CUSTOM_DATA_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "custom_apps.json")


def _load_data_file():
    try:
        path = os.path.abspath(DATA_FILE)
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
    except (OSError, ValueError):
        pass
    return None


def _load_custom_file():
    try:
        path = os.path.abspath(CUSTOM_DATA_FILE)
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data if isinstance(data, list) else []
    except (OSError, ValueError):
        pass
    return []


def _write_custom_file(entries):
    path = os.path.abspath(CUSTOM_DATA_FILE)
    directory = os.path.dirname(path)
    os.makedirs(directory, exist_ok=True)
    temporary = path + ".tmp"
    with open(temporary, "w", encoding="utf-8") as handle:
        json.dump(entries, handle, indent=2, ensure_ascii=False)
    os.replace(temporary, path)


def _defaults():
    return [
        {"name": name, "path": path, "category": "apps"}
        for name, path in APPLICATIONS.items()
    ]


def _entries():
    data = _load_data_file()
    base = data if isinstance(data, list) else _defaults()
    custom = _load_custom_file()
    merged = {str(item.get("name", "")).strip().lower(): item for item in base if item.get("name")}
    for item in custom:
        name = str(item.get("name", "")).strip().lower()
        if name:
            merged[name] = item
    return list(merged.values())


def save_custom_app(data):
    if not isinstance(data, dict):
        return {"error": "Game details are required"}, 400
    name = str(data.get("name") or "").strip()
    path = str(data.get("path") or "").strip()
    if not name or len(name) > 80:
        return {"error": "Game name must be 1-80 characters"}, 400
    existing = find_app(name)
    if not path and existing:
        path = str(existing.get("path") or "")
    if not path or len(path) > 500:
        return {"error": "Game executable path is required"}, 400
    image = str(data.get("image") or "").strip()
    if image and len(image) > 1000 or image and not (image.startswith("https://") or image.startswith("http://") or image.startswith("/")):
        return {"error": "Image must be an http(s) URL or local frontend path"}, 400
    custom = [item for item in _load_custom_file() if str(item.get("name", "")).lower() != name.lower()]
    entry = {
        "name": name,
        "path": path,
        "process": str(data.get("process") or (existing or {}).get("process") or "").strip(),
        "icon": str(data.get("icon") or (existing or {}).get("icon") or "🎮")[:8],
        "image": image,
        "category": "games",
        "actions": (existing or {}).get("actions", []) if isinstance((existing or {}).get("actions", []), list) else []
    }
    custom.append(entry)
    try:
        _write_custom_file(custom)
    except OSError as error:
        return {"error": "Could not save game: " + str(error)}, 500
    return _describe(entry)


def delete_custom_app(name):
    wanted = str(name or "").strip().lower()
    custom = _load_custom_file()
    kept = [item for item in custom if str(item.get("name", "")).strip().lower() != wanted]
    if len(kept) == len(custom):
        return {"error": "Custom game not found"}, 404
    try:
        _write_custom_file(kept)
    except OSError as error:
        return {"error": "Could not delete game: " + str(error)}, 500
    return {"deleted": name}


def find_app(name):
    if not name:
        return None

    wanted = str(name).strip().lower()

    for item in _entries():
        if str(item.get("name", "")).strip().lower() == wanted:
            return item

    return None


def _describe(item):
    actions = item.get("actions")

    return {
        "name": item.get("name"),
        "path": item.get("path"),
        "icon": item.get("icon"),
        "image": item.get("image", ""),
        "category": item.get("category", "apps"),
        "process": process_name_for(item),
        "running": is_running(item),
        "actions": actions if isinstance(actions, list) else []
    }


def get_apps():
    return [_describe(item) for item in _entries()]


def open_app(name):
    item = find_app(name)
    path = item.get("path") if item else APPLICATIONS.get(str(name or "").lower())

    if not path:
        return {"error": "Unknown application"}, 404

    command = [os.path.expandvars(path)] + LAUNCH_ARGUMENTS.get(str(name).lower(), [])

    try:
        subprocess.Popen(command, shell=False)
        return {"opened": item.get("name") if item else name}
    except OSError as e:
        return {"error": str(e)}, 500


def _declared_commands(item):
    """Commands this app published, so the phone cannot invent new ones."""
    allowed = set(BUILTIN_COMMANDS)

    for action in item.get("actions") or []:
        if not isinstance(action, dict):
            continue

        command = action.get("command")

        if isinstance(command, str):
            allowed.add(command.strip().lower())
        elif isinstance(command, list):
            allowed.add(json.dumps(command, sort_keys=True))

    return allowed


def command_key(command):
    """How a command is written in an app's allowlist."""
    if isinstance(command, list):
        return json.dumps(command, sort_keys=True)

    return str(command).strip().lower()


def declares(item, command):
    return command_key(command) in _declared_commands(item)


def action_id(item, command):
    key = command_key(command)

    if key in BUILTIN_COMMANDS:
        return key

    for index, action in enumerate(item.get("actions") or []):
        if isinstance(action, dict) and command_key(action.get("command")) == key:
            return "declared-{0}".format(index + 1)

    return "declared"


def _run_step(item, command):
    """One command from the grammar. Returns a Flask-shaped response."""
    text = str(command).strip()
    verb, _, argument = text.partition(":")
    verb = verb.lower()

    if verb == "launch":
        return open_app(item.get("name"))

    if verb == "focus":
        return focus_window(process_name_for(item))

    if verb == "close":
        return close_window(process_name_for(item))

    if verb == "hotkey":
        keys = [key.strip() for key in argument.split("+") if key.strip()]
        return press_hotkey(*keys)

    if verb == "type":
        return type_text(argument)

    if verb == "media":
        return media_action(argument)

    if verb == "delay":
        try:
            seconds = min(float(argument) / 1000.0, MAX_STEP_DELAY)
        except ValueError:
            return {"error": "delay wants milliseconds"}, 400

        time.sleep(max(seconds, 0))
        return {"delayed": seconds}

    return {"error": "Unsupported command: " + verb}, 400


def _failed(result):
    status = result[1] if isinstance(result, tuple) else 200
    body = result[0] if isinstance(result, tuple) else result

    return status >= 400 or (isinstance(body, dict) and "error" in body)


def app_action(name, action):
    if not name or not action:
        return {"error": "name and action required"}, 400

    item = find_app(name)

    if item is None:
        return {"error": "Unknown application"}, 404

    key = command_key(action)

    # Only what the PC published may run: an authenticated phone should not be
    # able to type arbitrary text or press arbitrary keys on the desktop.
    if not declares(item, action):
        return {"error": "Action not available for this app"}, 403

    steps = action if isinstance(action, list) else [action]
    last = {"ran": key}

    for step in steps:
        last = _run_step(item, step)

        if _failed(last):
            return last

    return last


def send_shortcut(*keys):
    return press_hotkey(*keys)
