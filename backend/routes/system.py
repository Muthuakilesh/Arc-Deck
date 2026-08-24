from flask import Blueprint, request
from ._errors import envelope

from services.stats import get_system_stats
from services.power import run_power_action



system_bp = Blueprint(
    "system",
    __name__
)



@system_bp.route("", methods=["GET"])
def system():
    return envelope(get_system_stats(), default_code="ERR_SYSTEM_STATS")


@system_bp.route("/power", methods=["POST"])
def power():
    data = request.get_json(silent=True) or {}
    return envelope(run_power_action(data.get("action")), default_code="ERR_SYSTEM_POWER")
