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
import time
import tempfile


DATA_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "auth.json")

MAX_TOKENS = 10
DEFAULT_TOKEN_TTL_DAYS = 30

_lock = threading.Lock()
_config = None


def _default_config():
    return {"pin": "{0:04d}".format(random.SystemRandom().randrange(10000)), "tokens": []}


def _ttl_seconds():
    try:
        days = int(os.environ.get("ARCDECK_TOKEN_TTL_DAYS", DEFAULT_TOKEN_TTL_DAYS))
    except (TypeError, ValueError):
        days = DEFAULT_TOKEN_TTL_DAYS

    return max(1, days) * 24 * 60 * 60


def _new_token_record(token, now=None):
    stamp = int(now if now is not None else time.time())

    return {
        "token": str(token),
        "issued_at": stamp,
        "expires_at": stamp + _ttl_seconds()
    }


def _normalize_tokens(tokens, now=None):
    stamp = int(now if now is not None else time.time())
    cleaned = []

    if not isinstance(tokens, list):
        return cleaned

    for entry in tokens:
        if isinstance(entry, str):
            record = _new_token_record(entry, now=stamp)
        elif isinstance(entry, dict) and entry.get("token"):
            try:
                expires = int(entry.get("expires_at", 0))
                issued = int(entry.get("issued_at", max(0, expires - _ttl_seconds())))
            except (TypeError, ValueError):
                continue

            record = {
                "token": str(entry.get("token")),
                "issued_at": issued,
                "expires_at": expires
            }
        else:
            continue

        if not record["token"] or record["expires_at"] <= stamp:
            continue

        cleaned.append(record)

    return cleaned[-MAX_TOKENS:]


def _read_file():
    try:
        with open(os.path.abspath(DATA_FILE), "r", encoding="utf-8") as handle:
            data = json.load(handle)
    except (OSError, ValueError):
        return None

    if not isinstance(data, dict) or not data.get("pin"):
        return None

    tokens = _normalize_tokens(data.get("tokens"), now=time.time())
    return {
        "pin": str(data["pin"]),
        "tokens": tokens
    }


def _write_file(config):
    path = os.path.abspath(DATA_FILE)
    os.makedirs(os.path.dirname(path), exist_ok=True)

    handle, temporary = tempfile.mkstemp(dir=os.path.dirname(path), suffix=".tmp")

    try:
        with os.fdopen(handle, "w", encoding="utf-8") as file:
            json.dump(config, file, indent=2)

        os.replace(temporary, path)
    except OSError:
        if os.path.exists(temporary):
            os.remove(temporary)
        raise


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
        config["tokens"] = _normalize_tokens(config.get("tokens"), now=time.time())
        config["tokens"] = (config["tokens"] + [_new_token_record(token)])[-MAX_TOKENS:]
        _write_file(config)
        return token


def is_valid_token(token):
    if not isinstance(token, str) or not token:
        return False

    with _lock:
        config = _load()
        before = list(config.get("tokens") or [])
        config["tokens"] = _normalize_tokens(before, now=time.time())

        if before != config["tokens"]:
            _write_file(config)

        tokens = config["tokens"]

    return any(hmac.compare_digest(token, known.get("token", "")) for known in tokens)


def revoke_all():
    with _lock:
        config = _load()
        config["tokens"] = []
        _write_file(config)
