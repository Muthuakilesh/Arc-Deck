from flask import Blueprint, Response, request
from ._errors import envelope, error_response

from services.mouse import click_mouse, move_mouse_to
from services.screen import ScreenError, capture

screen_bp = Blueprint("screen", __name__)


@screen_bp.route("", methods=["GET"])
def frame():
    try:
        image, width, height = capture(request.args.get("w"), request.args.get("q"))
    except ScreenError as error:
        return error_response(
            "Cannot capture the screen: {0}".format(error),
            status=503,
            code="ERR_SCREEN_CAPTURE"
        )

    response = Response(image, mimetype="image/jpeg")

    # The phone asks for a new frame every second or so; a cached one is worse
    # than useless.
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Screen-Width"] = str(width)
    response.headers["X-Screen-Height"] = str(height)

    return response


@screen_bp.route("/tap", methods=["POST"])
def tap():
    data = request.get_json(silent=True) or {}
    moved, moved_status = envelope(move_mouse_to(data.get("x"), data.get("y")), default_code="ERR_SCREEN_TAP")

    if moved_status >= 400:
        return moved, moved_status

    return envelope(click_mouse(data.get("button", "left")), default_code="ERR_SCREEN_TAP")
