from flask import Blueprint, request

from services.activity import clear_events, get_events, get_settings, get_suggestions, get_summary, record_event, update_settings
from routes._errors import error_response


activity_bp = Blueprint("activity", __name__)
CLIENT_EVENT_TYPES = {
    "suggestion.shown", "suggestion.accepted", "suggestion.dismissed",
    "focus.started", "focus.paused", "focus.completed", "focus.ended",
}


@activity_bp.route("", methods=["GET", "DELETE"])
def activity():
    if request.method == "DELETE":
        return {"deleted": clear_events()}
    try:
        return {"events": get_events(request.args.get("limit", 100), request.args.get("type"))}
    except ValueError as error:
        return error_response(error, status=400, code="ERR_ACTIVITY_VALIDATION")


@activity_bp.route("/summary", methods=["GET"])
def summary():
    try:
        return get_summary(request.args.get("days", 7))
    except ValueError as error:
        return error_response(error, status=400, code="ERR_ACTIVITY_VALIDATION")


@activity_bp.route("/suggestions", methods=["GET"])
def suggestions():
    return {"suggestions": get_suggestions()}


@activity_bp.route("/settings", methods=["GET", "POST"])
def settings():
    if request.method == "POST":
        try:
            return update_settings(request.get_json(silent=True) or {})
        except ValueError as error:
            return error_response(error, status=400, code="ERR_ACTIVITY_VALIDATION")
    return get_settings()


@activity_bp.route("/event", methods=["POST"])
def event():
    data = request.get_json(silent=True) or {}
    event_type = data.get("type")
    if event_type not in CLIENT_EVENT_TYPES:
        return error_response("Unsupported client event", status=400, code="ERR_ACTIVITY_EVENT")
    recorded = record_event(
        event_type,
        subject=data.get("subject"),
        action=data.get("action"),
        source=data.get("source", "frontend"),
        outcome=data.get("outcome", "success"),
        context=data.get("context"),
    )
    return {"event": recorded}