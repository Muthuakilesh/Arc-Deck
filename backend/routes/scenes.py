from flask import Blueprint, request

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
        return {"error": str(error)}, 400
    except OSError as error:
        return {"error": "Could not save scenes: {0}".format(error)}, 500


@scenes_bp.route("/<scene_id>", methods=["DELETE"])
def remove(scene_id):
    if not delete_scene(scene_id):
        return {"error": "Unknown scene"}, 404

    return {"deleted": scene_id}


@scenes_bp.route("/<scene_id>/run", methods=["POST"])
def run(scene_id):
    return run_scene(scene_id)
