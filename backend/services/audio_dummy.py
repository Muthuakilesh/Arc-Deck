"""In-memory volume backend used when the real Windows audio API is unavailable.

Lets the whole app (UI, routes, socket) run on Linux/macOS for development instead of
failing at import time.
"""

import threading

_lock = threading.Lock()
_level = 50
_muted = False

name = "dummy"


def get_state():
    with _lock:
        return {"volume": _level, "muted": _muted, "simulated": True}


def set_level(percent):
    global _level
    with _lock:
        _level = round(percent)
    return get_state()


def set_mute(muted):
    global _muted
    with _lock:
        _muted = bool(muted)
    return get_state()
