from flask import Blueprint, request
from ._errors import envelope

from services.gamepad import ALLOWED, held_keys, hold_key, release_all

gamepad_bp = Blueprint("gamepad", __name__)


@gamepad_bp.route("", methods=["GET"])
def state():
    return {"keys": sorted(ALLOWED), "held": held_keys()}


@gamepad_bp.route("/key", methods=["POST"])
def key():
    data = request.get_json(silent=True) or {}
    return envelope(hold_key(data.get("key"), bool(data.get("down"))), default_code="ERR_GAMEPAD_KEY")


@gamepad_bp.route("/release", methods=["POST"])
def release():
    return envelope(release_all(), default_code="ERR_GAMEPAD_RELEASE")
