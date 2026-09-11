from flask import Blueprint, request
from ._errors import envelope

from services.appsearch import launch_shortcut, search_shortcuts
from services.activity import record_event
from services.launcher import action_id, app_action, delete_custom_app, find_app, get_apps, open_app, save_custom_app
from services.processes import foreground_state, running_names

apps_bp = Blueprint("apps", __name__)


@apps_bp.route("/custom", methods=["POST"])
def save_custom():
    return envelope(save_custom_app(request.get_json(silent=True) or {}), default_code="ERR_CUSTOM_GAME")


@apps_bp.route("/custom/<name>", methods=["DELETE"])
def delete_custom(name):
    return envelope(delete_custom_app(name), default_code="ERR_CUSTOM_GAME")


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
    result = open_app(data.get("name"))
    body = result[0] if isinstance(result, tuple) else result
    status = result[1] if isinstance(result, tuple) else 200
    record_event(
        "app.launch",
        subject=data.get("name"),
        action="launch",
        source=data.get("source", "apps"),
        outcome="failed" if status >= 400 or (isinstance(body, dict) and body.get("error")) else "success",
    )
    return envelope(result, default_code="ERR_APPS_OPEN")


@apps_bp.route("/search", methods=["GET"])
def search():
    refresh = request.args.get("refresh") == "1"
    return {"results": search_shortcuts(request.args.get("q"), refresh)}


@apps_bp.route("/search/open", methods=["POST"])
def open_found():
    data = request.json or {}
    return envelope(launch_shortcut(data.get("id")), default_code="ERR_APPS_SEARCH_OPEN")


@apps_bp.route("/action", methods=["POST"])
def action():
    data = request.json or {}
    item = find_app(data.get("name"))
    result = app_action(data.get("name"), data.get("action"))
    body = result[0] if isinstance(result, tuple) else result
    status = result[1] if isinstance(result, tuple) else 200
    safe_action = action_id(item, data.get("action")) if item else "unknown"
    event_type = "app." + safe_action if safe_action in ("focus", "close") else "app.action"
    record_event(
        event_type,
        subject=data.get("name"),
        action=safe_action,
        source=data.get("source", "apps"),
        outcome="failed" if status >= 400 or (isinstance(body, dict) and body.get("error")) else "success",
    )
    return envelope(result, default_code="ERR_APPS_ACTION")
