import os
import subprocess


def run_power_action(action):
    """Run an explicitly requested Windows power action."""
    if os.name != "nt":
        return {"error": "Power controls are only available on Windows"}, 400

    commands = {
        "sleep": ["rundll32.exe", "powrprof.dll,SetSuspendState", "0,1,0"],
        "restart": ["shutdown", "/r", "/t", "0"],
        "shutdown": ["shutdown", "/s", "/t", "0"],
    }
    command = commands.get(str(action).lower())
    if not command:
        return {"error": "Unsupported power action"}, 400

    try:
        subprocess.Popen(command)
        return {"status": "sent", "action": str(action).lower()}
    except OSError as error:
        return {"error": str(error)}, 500
