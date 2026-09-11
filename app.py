import os
import socket
from ipaddress import ip_address
from urllib.parse import urlparse

from flask import Flask, request, send_from_directory
from flask_cors import CORS

from flask_socketio import SocketIO

from routes.system import system_bp
from routes.audio import audio_bp
from routes.apps import apps_bp
from routes.media import media_bp
from routes.media_bridge import media_bridge_bp
from routes.quick_settings import quick_settings_bp
from routes.scenes import scenes_bp
from routes.mouse import mouse_bp
from routes.screen import screen_bp
from routes.gamepad import gamepad_bp
from routes.keyboard import keyboard_bp
from routes.clipboard import clipboard_bp
from routes.actions import actions_bp
from routes.activity import activity_bp
from routes.auth import auth_bp, require_token
from routes._errors import error_response

from services.auth import get_pin, is_valid_token
from services.gamepad import hold_key, release_all
from services.mouse import move_mouse, scroll_mouse
from services.monitor import start_monitor
from services.volume import backend as audio_backend
from services.clipboard_sync import sync as clipboard_sync


frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend")
app = Flask(
    __name__,
    static_folder=frontend_dir,
    static_url_path=""
)


def _allowed_origins():
    extra = os.environ.get("ARCDECK_ALLOWED_ORIGINS", "")
    values = [item.strip() for item in extra.split(",") if item.strip()]
    return set(values)


def _is_lan_or_local(hostname):
    if not hostname:
        return False

    value = hostname.strip().lower()

    if value in ("localhost",):
        return True

    if value.endswith(".local"):
        return True

    try:
        parsed = ip_address(value)
    except ValueError:
        return False

    return bool(parsed.is_private or parsed.is_loopback or parsed.is_link_local)


def _lan_addresses():
    """Return usable IPv4 LAN addresses without exposing public addresses."""
    addresses = set()
    try:
        values = socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET)
        addresses.update(item[4][0] for item in values)
    except OSError:
        pass

    # UDP connect selects the active network interface without sending traffic.
    try:
        probe = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        probe.connect(("192.0.2.1", 80))
        addresses.add(probe.getsockname()[0])
        probe.close()
    except OSError:
        pass

    return sorted(address for address in addresses if _is_lan_or_local(address) and not address.startswith(("127.", "169.254.")))


def _origin_allowed(origin, host):
    if not origin:
        # Native/webview callers may omit Origin.
        return True

    if origin in _allowed_origins():
        return True

    parsed = urlparse(origin)
    request_host = (host or "").split(":", 1)[0].lower()
    origin_host = (parsed.hostname or "").lower()

    # The local companion extension authenticates with the same ArcDeck token.
    # Do not allow extension origins when this server is being reached over LAN.
    if parsed.scheme == "chrome-extension":
        return request_host in ("localhost", "127.0.0.1", "::1")

    if parsed.scheme not in ("http", "https"):
        return False

    if request_host and origin_host == request_host:
        return True

    return _is_lan_or_local(origin_host)


def _allowed_origin_for_cors(origin):
    return origin if _origin_allowed(origin, request.host) else None


CORS(
    app,
    resources={r"/api/*": {"origins": _allowed_origin_for_cors}},
    allow_headers=["Content-Type", "X-ArcDeck-Token"]
)


socketio = SocketIO(
    app,
    cors_allowed_origins="*"
)

clipboard_sync.configure_emitter(socketio.emit)


@app.before_request
def require_allowed_origin():
    path = request.path

    if not path.startswith("/api/"):
        return None

    if request.method == "OPTIONS":
        return None

    if _origin_allowed(request.headers.get("Origin"), request.host):
        return None

    return error_response("Origin not allowed", status=403, code="ERR_ORIGIN_NOT_ALLOWED")


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
    media_bridge_bp,
    url_prefix="/api/media/bridge"
)

app.register_blueprint(
    quick_settings_bp,
    url_prefix="/api/quick-settings"
)


app.register_blueprint(
    scenes_bp,
    url_prefix="/api/scenes"
)


app.register_blueprint(
    keyboard_bp,
    url_prefix="/api/keyboard"
)

app.register_blueprint(
    clipboard_bp,
    url_prefix="/api/clipboard"
)


app.register_blueprint(
    mouse_bp,
    url_prefix="/api/mouse"
)

app.register_blueprint(
    screen_bp,
    url_prefix="/api/screen"
)

app.register_blueprint(
    gamepad_bp,
    url_prefix="/api/gamepad"
)

app.register_blueprint(
    actions_bp,
    url_prefix="/api/action"
)

app.register_blueprint(
    activity_bp,
    url_prefix="/api/activity"
)

start_monitor(socketio)


@socketio.on("connect")
def on_connect(auth):
    """Stats are pushed over this socket, so it needs the same PIN gate as the API."""
    if not _origin_allowed(request.headers.get("Origin"), request.host):
        return False

    token = auth.get("token") if isinstance(auth, dict) else None

    if not is_valid_token(token):
        return False

    clipboard_sync.connect(request.sid, False)
    return True


@socketio.on("clipboard_sync")
def on_clipboard_sync(data):
    if not isinstance(data, dict):
        return
    result = clipboard_sync.set_enabled(request.sid, bool(data.get("enabled")))
    if isinstance(result, tuple):
        socketio.emit("clipboard_error", {"error": result[0].get("error", "Clipboard sync failed")}, to=request.sid)
        return
    socketio.emit("clipboard_state", result, to=request.sid)


@socketio.on("clipboard_update")
def on_clipboard_update(data):
    if not isinstance(data, dict):
        return
    result = clipboard_sync.phone_update(request.sid, data.get("text", ""))
    if isinstance(result, tuple):
        socketio.emit("clipboard_error", {"error": result[0].get("error", "Clipboard update failed")}, to=request.sid)


@socketio.on("mouse")
def on_mouse(data):
    """Pointer movement over the socket that is already open.

    A POST per touchmove means a connection, headers and a round trip for every
    few pixels, which on a phone shows up as the pointer trailing your finger by
    a noticeable amount. The socket is connected and authenticated already, so
    dragging costs one small frame each. Only a connection that passed on_connect
    can reach this.
    """
    if not isinstance(data, dict):
        return

    if data.get("type") == "scroll":
        scroll_mouse(data.get("amount", 0))
        return

    move_mouse(data.get("x", 0), data.get("y", 0))


@socketio.on("pad")
def on_pad(data):
    """Game buttons, held down for as long as the thumb is on them.

    Same reasoning as the pointer: a round trip between pressing and the
    character starting to walk is the difference between a usable controller
    and a frustrating one, so button edges ride the open socket.
    """
    if not isinstance(data, dict):
        return

    hold_key(data.get("key"), bool(data.get("down")))


@socketio.on("disconnect")
def on_disconnect():
    """A phone that drops mid-sprint should not leave W held down on the PC."""
    release_all()
    clipboard_sync.disconnect(request.sid)


@app.route("/api/status")
def status():
    return {
        "name": "ArcDeck",
        "status": "online",
        "audio": audio_backend.name,
        "lan_addresses": _lan_addresses()
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
    for address in _lan_addresses():
        print("Open ArcDeck on your phone: http://{0}:5000".format(address))
    print("Audio backend: {0}".format(audio_backend.name))
    socketio.run(
        app,
        host="0.0.0.0",
        port=5000,
        allow_unsafe_werkzeug=True
    )
