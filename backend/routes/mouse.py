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



@mouse_bp.route(
"/move",
methods=["POST"]
)
def move():


    data=request.json


    return move_mouse(
        data["x"],
        data["y"]
    )




@mouse_bp.route(
"/click",
methods=["POST"]
)
def click():


    data=request.json


    return click_mouse(
        data["button"]
    )




@mouse_bp.route(
"/scroll",
methods=["POST"]
)
def scroll():


    data=request.json


    return scroll_mouse(
        data["amount"]
    )