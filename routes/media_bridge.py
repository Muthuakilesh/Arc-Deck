from flask import Blueprint, request

from services import chrome_media
from ._errors import error_response


media_bridge_bp = Blueprint("media_bridge", __name__)


@media_bridge_bp.route("/state", methods=["POST"])
def update_state():
    try:
        command = chrome_media.update(request.get_json(silent=True) or {})
    except ValueError as error:
        return error_response(str(error), status=400, code="ERR_MEDIA_BRIDGE_STATE")
    return {"command": command}
