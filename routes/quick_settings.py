from flask import Blueprint, request

from services.quick_settings import action, get_state
from ._errors import envelope


quick_settings_bp = Blueprint("quick_settings", __name__)


@quick_settings_bp.route("", methods=["GET"])
def state():
    return envelope(get_state(), default_code="ERR_QUICK_SETTINGS_STATUS")


@quick_settings_bp.route("/action", methods=["POST"])
def run_action():
    data = request.get_json(silent=True) or {}
    return envelope(action(str(data.get("action") or ""), data.get("enabled")), default_code="ERR_QUICK_SETTINGS_ACTION")
