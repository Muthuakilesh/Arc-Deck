from flask import Blueprint, request


from services.volume import (
    get_volume,
    set_volume,
    adjust_volume,
    toggle_mute
)



audio_bp = Blueprint(
    "audio",
    __name__
)



@audio_bp.route(
"",
methods=["GET"]
)
def volume():

    return get_volume()





@audio_bp.route("/volume", methods=["POST"])
def update_volume():
    data = request.json
    value = data.get("value")

    # ensure numeric volume value (0-100)
    try:
        val = float(value)
    except Exception:
        return {"error": "invalid volume value"}, 400

    # clamp
    val = max(0.0, min(100.0, val))

    return set_volume(val)


@audio_bp.route("/adjust", methods=["POST"])
def adjust():
    data = request.get_json(silent=True) or {}
    try:
        return adjust_volume(data.get("delta"))
    except ValueError:
        return {"error": "invalid volume delta"}, 400





@audio_bp.route(
"/mute",
methods=["POST"]
)
def mute():


    return toggle_mute()
