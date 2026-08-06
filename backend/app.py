import os

from flask import Flask, send_from_directory
from flask_cors import CORS

from flask_socketio import SocketIO

from routes.system import system_bp
from routes.audio import audio_bp
from routes.apps import apps_bp
from routes.media import media_bp
from routes.mouse import mouse_bp
from routes.keyboard import keyboard_bp
from routes.actions import actions_bp
from routes.auth import auth_bp, require_token

from services.auth import get_pin, is_valid_token
from services.monitor import start_monitor
from services.volume import backend as audio_backend


frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend")
app = Flask(
    __name__,
    static_folder=frontend_dir,
    static_url_path=""
)

CORS(app, resources={r"/api/*": {"origins": "*"}}, allow_headers=["Content-Type", "X-ArcDeck-Token"])


socketio = SocketIO(
    app,
    cors_allowed_origins="*"
)


app.before_request(require_token)


app.register_blueprint(
    auth_bp,
    url_prefix="/api/auth"
)


app.register_blueprint(
    system_bp,
    url_prefix="/api/system"
)


app.register_blueprint(
    audio_bp,
    url_prefix="/api/audio"
)


app.register_blueprint(
    apps_bp,
    url_prefix="/api/apps"
)


app.register_blueprint(
    media_bp,
    url_prefix="/api/media"
)


app.register_blueprint(
    keyboard_bp,
    url_prefix="/api/keyboard"
)


app.register_blueprint(
    mouse_bp,
    url_prefix="/api/mouse"
)

app.register_blueprint(
    actions_bp,
    url_prefix="/api/action"
)

start_monitor(socketio)


@socketio.on("connect")
def on_connect(auth):
    """Stats are pushed over this socket, so it needs the same PIN gate as the API."""
    token = auth.get("token") if isinstance(auth, dict) else None

    if not is_valid_token(token):
        return False

    return True


@app.route("/api/status")
def status():
    return {
        "name": "ArcDeck",
        "status": "online",
        "audio": audio_backend.name
    }


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def index(path):
    full_path = os.path.join(app.static_folder, path)
    if path and os.path.exists(full_path):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, "index.html")


if __name__ == "__main__":
    print("ArcDeck pairing PIN: {0}".format(get_pin()))
    print("Audio backend: {0}".format(audio_backend.name))
    socketio.run(
        app,
        host="0.0.0.0",
        port=5000,
        allow_unsafe_werkzeug=True
    )
