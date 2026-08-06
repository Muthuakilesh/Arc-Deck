from flask import Blueprint, request

from services.launcher import (
    get_apps,
    open_app,
    app_action
)

apps_bp = Blueprint(
    "apps",
    __name__
)




@apps_bp.route(
"",
methods=["GET"]
)
def apps():


    return get_apps()





@apps_bp.route(
"/open",
methods=["POST"]
)
def launch():
    data = request.json or {}
    return open_app(data.get("name"))


@apps_bp.route(
"/action",
methods=["POST"]
)
def action():
    data = request.json or {}
    return app_action(
        data.get("name"),
        data.get("action")
    )