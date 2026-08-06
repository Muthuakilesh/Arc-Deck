from flask import Blueprint, request

from services.launcher import app_action, get_apps, open_app
from services.processes import foreground_state, running_names

apps_bp = Blueprint("apps", __name__)


@apps_bp.route("", methods=["GET"])
def apps():
    return get_apps()


@apps_bp.route("/running", methods=["GET"])
def running():
    apps = get_apps()
    return {"running": running_names(apps), "foreground": foreground_state(apps)}


@apps_bp.route("/open", methods=["POST"])
def launch():
    data = request.json or {}
    return open_app(data.get("name"))


@apps_bp.route("/action", methods=["POST"])
def action():
    data = request.json or {}
    return app_action(data.get("name"), data.get("action"))
