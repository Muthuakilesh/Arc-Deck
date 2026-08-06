from flask import Blueprint, request

from services.keyboard import type_text, press_hotkey

keyboard_bp = Blueprint(
    "keyboard",
    __name__
)


@keyboard_bp.route(
    "/type",
    methods=["POST"]
)
def type_route():
    data = request.json or {}
    text = data.get("text", "")
    return type_text(text)


@keyboard_bp.route(
    "/hotkey",
    methods=["POST"]
)
def hotkey_route():
    data = request.json or {}
    keys = data.get("keys")
    if isinstance(keys, str):
        keys = [k.strip() for k in keys.split("+") if k.strip()]
    return press_hotkey(*(keys or []))
