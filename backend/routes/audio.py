from flask import Blueprint, request
from ._errors import error_response

from services.volume import (
    AudioError,
    SessionMissing,
    get_sessions,
    get_volume,
    set_volume,
    adjust_volume,
    set_mute,
    set_session_mute,
    set_session_volume,
    toggle_mute
)


audio_bp = Blueprint(
    "audio",
    __name__
)


def _guard(action):
    """Turn audio/validation failures into JSON the phone UI can display."""
    try:
        return action()
    except ValueError as error:
        return error_response(error, status=400, code="ERR_AUDIO_VALIDATION")
    except SessionMissing as error:
        return error_response(error, status=404, code="ERR_AUDIO_SESSION_MISSING")
    except AudioError as error:
        return error_response(
            "Audio device unavailable: {0}".format(error),
            status=503,
            code="ERR_AUDIO_UNAVAILABLE"
        )


@audio_bp.route("", methods=["GET"])
def volume():
    return _guard(get_volume)


@audio_bp.route("/volume", methods=["POST"])
def update_volume():
    data = request.get_json(silent=True) or {}
    return _guard(lambda: set_volume(data.get("value")))


@audio_bp.route("/adjust", methods=["POST"])
def adjust():
    data = request.get_json(silent=True) or {}
    return _guard(lambda: adjust_volume(data.get("delta")))


@audio_bp.route("/mute", methods=["POST"])
def mute():
    data = request.get_json(silent=True) or {}
    muted = data.get("muted")

    if muted is None:
        return _guard(toggle_mute)

    return _guard(lambda: set_mute(muted))


@audio_bp.route("/sessions", methods=["GET"])
def sessions():
    return _guard(lambda: {"sessions": get_sessions()})


@audio_bp.route("/sessions/volume", methods=["POST"])
def session_volume():
    data = request.get_json(silent=True) or {}
    return _guard(lambda: set_session_volume(data.get("pid"), data.get("value")))


@audio_bp.route("/sessions/mute", methods=["POST"])
def session_mute():
    data = request.get_json(silent=True) or {}
    return _guard(lambda: set_session_mute(data.get("pid"), data.get("muted")))
