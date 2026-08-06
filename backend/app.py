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

from services.monitor import start_monitor


frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend")
app = Flask(
    __name__,
    static_folder=frontend_dir,
    static_url_path=""
)

CORS(app)



socketio = SocketIO(
    app,
    cors_allowed_origins="*"
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


@app.route("/api/status")
def status():
    return {
        "name": "ArcDeck",
        "status": "online"
    }


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def index(path):
    full_path = os.path.join(app.static_folder, path)
    if path and os.path.exists(full_path):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, "index.html")





if __name__=="__main__":
    socketio.run(
        app,
        host="0.0.0.0",
        port=5000
    )
