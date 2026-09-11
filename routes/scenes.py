from flask import Blueprint, request
from ._errors import envelope, error_response

from services.scenes import SceneError, cancel_run, delete_scene, get_run, get_run_history, get_scenes, run_scene, save_scene, start_scene

scenes_bp = Blueprint("scenes", __name__)


@scenes_bp.route("", methods=["GET"])
def scenes():
    return {"scenes": get_scenes()}


@scenes_bp.route("", methods=["POST"])
def save():
    try:
        return {"scene": save_scene(request.get_json(silent=True) or {})}
    except SceneError as error:
        return error_response(error, status=400, code="ERR_SCENE_VALIDATION")
    except OSError as error:
        return error_response("Could not save scenes: {0}".format(error), status=500, code="ERR_SCENE_SAVE")


@scenes_bp.route("/<scene_id>", methods=["DELETE"])
def remove(scene_id):
    if not delete_scene(scene_id):
        return error_response("Unknown scene", status=404, code="ERR_SCENE_NOT_FOUND")

    return {"deleted": scene_id}


@scenes_bp.route("/<scene_id>/run", methods=["POST"])
def run(scene_id):
    return envelope(run_scene(scene_id), default_code="ERR_SCENE_RUN")


@scenes_bp.route("/<scene_id>/start", methods=["POST"])
def start(scene_id):
    return envelope(start_scene(scene_id), default_code="ERR_SCENE_RUN")


@scenes_bp.route("/runs", methods=["GET"])
def runs():
    return {"runs": get_run_history(request.args.get("limit", 30))}


@scenes_bp.route("/runs/<run_id>", methods=["GET"])
def run_status(run_id):
    found = get_run(run_id)
    if not found:
        return error_response("Unknown scene run", status=404, code="ERR_SCENE_RUN_NOT_FOUND")
    return {"run": found}


@scenes_bp.route("/runs/<run_id>/cancel", methods=["POST"])
def cancel(run_id):
    if not cancel_run(run_id):
        return error_response("Scene run is not active", status=409, code="ERR_SCENE_RUN_NOT_ACTIVE")
    return {"run_id": run_id, "status": "cancelling"}
