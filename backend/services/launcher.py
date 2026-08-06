import json
import os
import subprocess

from .keyboard import press_hotkey, type_text
from .media import media_action


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


DATA_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "apps.json")


def _load_data_file():
    try:
        path = os.path.abspath(DATA_FILE)
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
    except (OSError, ValueError):
        pass
    return None


def get_apps():
    # Prefer a data file if present for dynamic app lists
    data = _load_data_file()
    apps = []
    if isinstance(data, list):
        for item in data:
            apps.append({
                "name": item.get("name"),
                "path": item.get("path"),
                "icon": item.get("icon"),
                "category": item.get("category", "apps"),
                "running": False,
                "actions": item.get("actions", [])
            })
        return apps

    # Fallback to static mapping
    for name, path in APPLICATIONS.items():
        apps.append({
            "name": name,
            "path": path,
            "icon": None,
            "category": "apps",
            "running": False,
            "actions": []
        })
    return apps


def open_app(name):
    if not name:
        return {"error": "name required"}

    # Try data file first
    data = _load_data_file()
    path = None
    if isinstance(data, list):
        for item in data:
            if str(item.get("name", "")).lower() == name.lower():
                path = item.get("path")
                break

    # Fallback to static mapping
    if not path:
        path = APPLICATIONS.get(name.lower())

    if not path:
        return {"error": "Unknown application"}

    command = [os.path.expandvars(path)] + LAUNCH_ARGUMENTS.get(name.lower(), [])

    try:
        subprocess.Popen(command, shell=False)
        return {"opened": name}
    except OSError as e:
        return {"error": str(e)}


def app_action(name, action):
    if not name or not action:
        return {"error": "name and action required"}, 400

    raw_action = str(action)
    action = raw_action.lower()
    name = str(name).lower()

    # Discord-specific shortcuts
    if name == "discord":
        if action == "mute":
            return send_shortcut("ctrl", "shift", "m")
        if action == "deafen":
            return send_shortcut("ctrl", "shift", "d")

    if action.startswith("media:"):
        return media_action(action.split(":", 1)[1])

    if action.startswith("hotkey:"):
        keys = raw_action.split(":", 1)[1].split("+")
        return send_shortcut(*[k.strip() for k in keys if k.strip()])

    if action.startswith("type:"):
        return type_text(raw_action.split(":", 1)[1])

    # fallback: open app if action is launch
    if action == "launch":
        return open_app(name)

    return {"action": action, "name": name, "status": "unsupported"}


def send_shortcut(*keys):
    return press_hotkey(*keys)
