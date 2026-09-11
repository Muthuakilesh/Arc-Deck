"""Short-lived media state supplied by the local ArcDeck Chrome extension."""

from copy import deepcopy
import threading
import time


_LOCK = threading.Lock()
_STATE = None
_UPDATED_AT = 0.0
_COMMAND = None
_MAX_AGE_SECONDS = 5.0


def _number(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def update(state):
    """Store an extension report and return any pending remote command."""
    if not isinstance(state, dict):
        raise ValueError("Media state must be an object")

    duration = max(0.0, _number(state.get("duration")))
    position = max(0.0, _number(state.get("position")))
    cleaned = {
        "title": str(state.get("title") or "Unknown YouTube track")[:300],
        "artist": str(state.get("artist") or "")[:300],
        "album": str(state.get("album") or "YouTube" )[:300],
        "playing": bool(state.get("playing")),
        "position": min(position, duration) if duration else position,
        "duration": duration,
        "can_seek": bool(state.get("can_seek")) and duration > 0,
        "source": "chrome-youtube",
    }
    artwork = str(state.get("artwork") or "")
    if artwork.startswith("https://"):
        cleaned["artwork"] = artwork[:2048]

    global _STATE, _UPDATED_AT, _COMMAND
    with _LOCK:
        _STATE = cleaned
        _UPDATED_AT = time.monotonic()
        command = _COMMAND
        _COMMAND = None
    return deepcopy(command) if command else None


def get_media():
    with _LOCK:
        if _STATE is None or time.monotonic() - _UPDATED_AT > _MAX_AGE_SECONDS:
            return None
        return deepcopy(_STATE)


def queue_action(action, position=None):
    """Queue a phone action for the next extension heartbeat."""
    global _COMMAND
    with _LOCK:
        if _STATE is None or time.monotonic() - _UPDATED_AT > _MAX_AGE_SECONDS:
            return False
        command = {"action": action}
        if position is not None:
            command["position"] = position
        _COMMAND = command
    return True
