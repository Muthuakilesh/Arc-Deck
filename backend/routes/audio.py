from flask import Blueprint, request

from services.volume import (
    AudioError,
    get_volume,
    set_volume,
    adjust_volume,
    set_mute,
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
        return {"error": str(error)}, 400
    except AudioError as error:
        return {"error": "Audio device unavailable: {0}".format(error)}, 503


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
