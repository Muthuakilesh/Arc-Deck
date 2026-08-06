from flask import Blueprint, request

from services.appsearch import launch_shortcut, search_shortcuts
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


@apps_bp.route("/search", methods=["GET"])
def search():
    refresh = request.args.get("refresh") == "1"
    return {"results": search_shortcuts(request.args.get("q"), refresh)}


@apps_bp.route("/search/open", methods=["POST"])
def open_found():
    data = request.json or {}
    return launch_shortcut(data.get("id"))


@apps_bp.route("/action", methods=["POST"])
def action():
    data = request.json or {}
    return app_action(data.get("name"), data.get("action"))
