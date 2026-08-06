from flask import Blueprint, request

from services.stats import get_system_stats
from services.power import run_power_action



system_bp = Blueprint(
    "system",
    __name__
)



@system_bp.route("", methods=["GET"])
def system():

    return get_system_stats()


@system_bp.route("/power", methods=["POST"])
def power():
    data = request.get_json(silent=True) or {}
    return run_power_action(data.get("action"))
