from flask import Blueprint, request

from services.mouse import (
    move_mouse,
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
    return move_mouse(data.get("x", 0), data.get("y", 0))


@mouse_bp.route("/click", methods=["POST"])
def click():
    data = request.get_json(silent=True) or {}
    return click_mouse(data.get("button", "left"))


@mouse_bp.route("/scroll", methods=["POST"])
def scroll():
    data = request.get_json(silent=True) or {}
    return scroll_mouse(data.get("amount", 0))
