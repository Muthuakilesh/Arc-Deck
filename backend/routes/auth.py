from flask import Blueprint, request

from services.auth import is_valid_token, login, revoke_all


auth_bp = Blueprint(
    "auth",
    __name__
)


TOKEN_HEADER = "X-ArcDeck-Token"

# Reachable before a token exists: the login handshake itself plus the liveness probe.
PUBLIC_ENDPOINTS = ("auth.session", "auth.login_route", "status")


@auth_bp.route("/session", methods=["GET"])
def session():
    return {"authenticated": is_valid_token(request.headers.get(TOKEN_HEADER))}


@auth_bp.route("/login", methods=["POST"])
def login_route():
    data = request.get_json(silent=True) or {}
    token = login(str(data.get("pin", "")))

    if not token:
        return {"error": "Incorrect PIN"}, 401

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

    if is_valid_token(request.headers.get(TOKEN_HEADER)):
        return None

    return {"error": "PIN required"}, 401
