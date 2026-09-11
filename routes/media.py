from flask import Blueprint
from ._errors import envelope

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
    return envelope(get_media(), default_code="ERR_MEDIA_STATUS")



@media_bp.route(
"/action",
methods=["POST"]
)
def action():

    from flask import request

    data = request.json or {}
    return envelope(media_action(data.get("action"), data.get("position")), default_code="ERR_MEDIA_ACTION")