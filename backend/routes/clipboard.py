from flask import Blueprint, request

from ._errors import envelope
from services.clipboard import read_text, write_text


clipboard_bp = Blueprint("clipboard", __name__)


@clipboard_bp.route("", methods=["GET"])
def read():
    return envelope(read_text(), default_code="ERR_CLIPBOARD_READ")


@clipboard_bp.route("", methods=["POST"])
def write():
    data = request.get_json(silent=True) or {}
    return envelope(write_text(data.get("text", "")), default_code="ERR_CLIPBOARD_WRITE")