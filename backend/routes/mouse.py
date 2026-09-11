from flask import Blueprint, request
from ._errors import envelope

from services.mouse import (
    move_mouse,
    press_mouse,
    click_mouse,
    scroll_mouse
)


mouse_bp = Blueprint(
    "mouse",
    __name__
)


@mouse_bp.route("/move", methods=["POST"])
def move():
    data = request.get_json(silent=True) or {}
    return envelope(move_mouse(data.get("x", 0), data.get("y", 0)), default_code="ERR_MOUSE_MOVE")


@mouse_bp.route("/press", methods=["POST"])
def press():
    data = request.get_json(silent=True) or {}
    return envelope(press_mouse(data.get("button", "left"), bool(data.get("down"))), default_code="ERR_MOUSE_PRESS")


@mouse_bp.route("/click", methods=["POST"])
def click():
    data = request.get_json(silent=True) or {}
    return envelope(click_mouse(data.get("button", "left")), default_code="ERR_MOUSE_CLICK")


@mouse_bp.route("/scroll", methods=["POST"])
def scroll():
    data = request.get_json(silent=True) or {}
    return envelope(scroll_mouse(data.get("amount", 0)), default_code="ERR_MOUSE_SCROLL")
