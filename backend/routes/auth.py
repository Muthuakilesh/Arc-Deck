from flask import Blueprint, request

from services.auth import is_valid_token, login, revoke_all
from ._errors import error_response

import threading
import time


auth_bp = Blueprint(
    "auth",
    __name__
)


TOKEN_HEADER = "X-ArcDeck-Token"

# Reachable before a token exists: the login handshake itself plus the liveness probe.
PUBLIC_ENDPOINTS = ("auth.session", "auth.login_route", "status")

LOGIN_WINDOW_SECONDS = 10 * 60
LOGIN_MAX_ATTEMPTS = 5
LOGIN_LOCKOUT_SECONDS = 15 * 60

API_WINDOW_SECONDS = 60
API_MAX_REQUESTS = 240
SCREEN_WINDOW_SECONDS = 10
SCREEN_MAX_REQUESTS = 60

_auth_lock = threading.Lock()
_login_attempts = {}
_api_counts = {}


def _client_ip():
    forwarded = request.headers.get("X-Forwarded-For", "")

    if forwarded:
        return forwarded.split(",", 1)[0].strip()

    return request.remote_addr or "unknown"


def _consume(ip, key, window_seconds, max_requests, now=None):
    stamp = int(now if now is not None else time.time())
    bucket = _api_counts.get((ip, key))

    if not bucket or stamp - bucket["started"] >= window_seconds:
        bucket = {"started": stamp, "count": 0}

    bucket["count"] += 1
    _api_counts[(ip, key)] = bucket

    if bucket["count"] > max_requests:
        retry = max(1, window_seconds - (stamp - bucket["started"]))
        return retry

    return 0


def _check_login_lock(ip, now=None):
    stamp = int(now if now is not None else time.time())
    entry = _login_attempts.get(ip)

    if not entry:
        return 0

    locked_until = int(entry.get("locked_until", 0))

    if locked_until > stamp:
        return locked_until - stamp

    if stamp - int(entry.get("window_started", stamp)) >= LOGIN_WINDOW_SECONDS:
        _login_attempts.pop(ip, None)

    return 0


def _record_login_failure(ip, now=None):
    stamp = int(now if now is not None else time.time())
    entry = _login_attempts.get(ip)

    if not entry or stamp - int(entry.get("window_started", stamp)) >= LOGIN_WINDOW_SECONDS:
        entry = {"window_started": stamp, "fails": 0, "locked_until": 0}

    entry["fails"] = int(entry.get("fails", 0)) + 1

    if entry["fails"] >= LOGIN_MAX_ATTEMPTS:
        entry["locked_until"] = stamp + LOGIN_LOCKOUT_SECONDS
        entry["fails"] = 0
        entry["window_started"] = stamp

    _login_attempts[ip] = entry


def _record_login_success(ip):
    _login_attempts.pop(ip, None)


@auth_bp.route("/session", methods=["GET"])
def session():
    return {"authenticated": is_valid_token(request.headers.get(TOKEN_HEADER))}


@auth_bp.route("/login", methods=["POST"])
def login_route():
    ip = _client_ip()

    with _auth_lock:
        retry = _check_login_lock(ip)

    if retry > 0:
        return error_response(
            "Too many login attempts. Try again later.",
            status=429,
            code="ERR_LOGIN_RATE_LIMIT",
            details={"retry_after": retry}
        )

    data = request.get_json(silent=True) or {}
    token = login(str(data.get("pin", "")))

    if not token:
        with _auth_lock:
            _record_login_failure(ip)
        return error_response("Incorrect PIN", status=401, code="ERR_AUTH_INVALID_PIN")

    with _auth_lock:
        _record_login_success(ip)

    return {"token": token}


@auth_bp.route("/logout", methods=["POST"])
def logout_route():
    revoke_all()
    return {"status": "revoked"}


def require_token():
    """before_request guard: block unauthenticated calls to /api/*."""
    path = request.path

    if not path.startswith("/api/"):
        return None

    if request.method == "OPTIONS":
        return None

    if request.endpoint in PUBLIC_ENDPOINTS:
        return None

    ip = _client_ip()

    with _auth_lock:
        retry = _consume(ip, "api", API_WINDOW_SECONDS, API_MAX_REQUESTS)

        if request.path.startswith("/api/screen"):
            screen_retry = _consume(ip, "screen", SCREEN_WINDOW_SECONDS, SCREEN_MAX_REQUESTS)
            retry = max(retry, screen_retry)

    if retry > 0:
        return error_response(
            "Too many requests",
            status=429,
            code="ERR_RATE_LIMIT",
            details={"retry_after": retry}
        )

    if is_valid_token(request.headers.get(TOKEN_HEADER)):
        return None

    return error_response("PIN required", status=401, code="ERR_AUTH_REQUIRED")
