"""Shared-PIN gate for the LAN API.

Without this, anyone on the same network can reach /api/system/power and shut the PC
down. The PIN lives in backend/data/auth.json (created on first run, never committed);
the phone exchanges it once for a long-lived token it keeps in localStorage.
"""

import hmac
import json
import os
import random
import secrets
import threading


DATA_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "auth.json")

MAX_TOKENS = 10

_lock = threading.Lock()
_config = None


def _default_config():
    return {"pin": "{0:04d}".format(random.SystemRandom().randrange(10000)), "tokens": []}


def _read_file():
    try:
        with open(os.path.abspath(DATA_FILE), "r", encoding="utf-8") as handle:
            data = json.load(handle)
    except (OSError, ValueError):
        return None

    if not isinstance(data, dict) or not data.get("pin"):
        return None

    tokens = data.get("tokens")
    return {
        "pin": str(data["pin"]),
        "tokens": [str(token) for token in tokens] if isinstance(tokens, list) else []
    }


def _write_file(config):
    path = os.path.abspath(DATA_FILE)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(config, handle, indent=2)


def _load():
    global _config

    if _config is not None:
        return _config

    env_pin = os.environ.get("ARCDECK_PIN")
    config = _read_file()

    if config is None:
        config = _default_config()
        if env_pin:
            config["pin"] = env_pin
        _write_file(config)
    elif env_pin and env_pin != config["pin"]:
        config["pin"] = env_pin
        config["tokens"] = []
        _write_file(config)

    _config = config
    return _config


def get_pin():
    with _lock:
        return _load()["pin"]


def login(pin):
    """Trade the PIN for a token. Returns None when the PIN is wrong."""
    with _lock:
        config = _load()

        if not isinstance(pin, str) or not hmac.compare_digest(pin.strip(), config["pin"]):
            return None

        token = secrets.token_urlsafe(32)
        config["tokens"] = (config["tokens"] + [token])[-MAX_TOKENS:]
        _write_file(config)
        return token


def is_valid_token(token):
    if not isinstance(token, str) or not token:
        return False

    with _lock:
        tokens = _load()["tokens"]

    return any(hmac.compare_digest(token, known) for known in tokens)


def revoke_all():
    with _lock:
        config = _load()
        config["tokens"] = []
        _write_file(config)
