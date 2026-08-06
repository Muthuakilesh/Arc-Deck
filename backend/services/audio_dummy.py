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


# Stand-ins for the Windows audio sessions, so the mixer UI can be built and
# driven without a PC.
_sessions = {
    9001: {"pid": 9001, "process": "chrome.exe", "volume": 80, "muted": False},
    9002: {"pid": 9002, "process": "Spotify.exe", "volume": 65, "muted": False},
    9003: {"pid": 9003, "process": "Discord.exe", "volume": 100, "muted": False}
}


def get_sessions():
    with _lock:
        return [dict(session) for session in _sessions.values()]


def set_session_level(pid, percent):
    with _lock:
        session = _sessions.get(pid)

        if session is None:
            return None

        session["volume"] = round(percent)
        return dict(session)


def set_session_mute(pid, muted):
    with _lock:
        session = _sessions.get(pid)

        if session is None:
            return None

        session["muted"] = bool(muted)
        return dict(session)
