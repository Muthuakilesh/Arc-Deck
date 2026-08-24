"""Compatibility command bridge for the original single-file ArcDeck UI."""

from flask import Blueprint, request
from ._errors import error_response

from services.volume import AudioError, get_volume, set_volume, toggle_mute
from services.launcher import open_app, app_action
from services.media import media_action
from services.mouse import move_mouse, click_mouse
from services.keyboard import press_hotkey
from services.power import run_power_action
from ._errors import envelope


actions_bp = Blueprint("actions", __name__)


# The old UI asked for these by name; apps.json now spells them as hotkeys.
DISCORD_LEGACY = {
    "mute": "hotkey:ctrl+shift+m",
    "deafen": "hotkey:ctrl+shift+d"
}


def _envelope(result):
    """Services answer like Flask views; this UI wants a success flag."""
    body, code = result if isinstance(result, tuple) else (result, 200)
    body = body if isinstance(body, dict) else {"result": body}

    return dict(body, success="error" not in body), code


@actions_bp.route("", methods=["POST"])
def action():
    data = request.get_json(silent=True) or {}
    command = data.get("command")

    try:
        if command == "volume":
            value = float(data.get("value"))
            result = set_volume(value)
            return {"success": True, **result}

        if command == "mute":
            result = toggle_mute()
            return {"success": True, **result}

        if command == "volume_state":
            return {"success": True, **get_volume()}

        if command == "launch":
            return _envelope(open_app(data.get("app", "")))

        if command == "media":
            result = media_action(data.get("key"))
            return {"success": isinstance(result, dict) and "error" not in result, **result}

        if command == "discord":
            action_name = str(data.get("action", "")).lower()
            return _envelope(app_action("discord", DISCORD_LEGACY.get(action_name, action_name)))

        if command == "power":
            result = run_power_action(data.get("action"))
            if isinstance(result, tuple):
                body, code = envelope(result, default_code="ERR_POWER_ACTION")
                return {"success": False, **body}, code
            return {"success": "error" not in result, **result}

        if command == "trackpad":
            result = move_mouse(data.get("dx", 0), data.get("dy", 0))
            return {"success": "error" not in result, **result}

        if command == "input":
            key = str(data.get("action", "")).lower()
            if key == "click":
                result = click_mouse("left")
            else:
                result = press_hotkey(key)
            return {"success": "error" not in result, **result}
    except (TypeError, ValueError) as error:
        body, code = error_response(str(error) or "invalid request", status=400, code="ERR_ACTION_VALIDATION")
        return dict(body, success=False), code
    except AudioError as error:
        body, code = error_response(
            "Audio device unavailable: {0}".format(error),
            status=503,
            code="ERR_AUDIO_UNAVAILABLE"
        )
        return dict(body, success=False), code
    except Exception as error:
        body, code = error_response(str(error), status=500, code="ERR_ACTION_RUNTIME")
        return dict(body, success=False), code

    body, code = error_response("unsupported command", status=400, code="ERR_ACTION_UNSUPPORTED")
    return dict(body, success=False), code
