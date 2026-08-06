from flask import Blueprint

from services.media import (
    get_media,
    media_action
)


media_bp = Blueprint(
    "media",
    __name__
)



@media_bp.route(
"",
methods=["GET"]
)
def current_media():

    return get_media()



@media_bp.route(
"/action",
methods=["POST"]
)
def action():

    from flask import request

    data = request.json or {}
    return media_action(data.get("action"))