from flask import Blueprint, request
from ._errors import envelope, error_response

from services.scenes import SceneError, delete_scene, get_scenes, run_scene, save_scene

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
