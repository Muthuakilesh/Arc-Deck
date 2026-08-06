"""Holding keys down for as long as a thumb is on a button.

The keyboard service types and fires hotkeys, which is the wrong shape for a
game: walking forward is one keyDown when the thumb lands and one keyUp when it
leaves, possibly seconds later. Every key that goes down is remembered so a
phone that walks out of Wi-Fi mid-sprint does not leave W stuck down forever.
"""
import string

from .keyboard import pyautogui


# The phone may only hold keys a game would use. This is not a big restriction
# in practice and it keeps a paired phone from, say, holding down Alt+F4.
ALLOWED = set(string.ascii_lowercase) | set(string.digits) | {
    "up", "down", "left", "right",
    "space", "enter", "tab", "esc", "backspace",
    "shift", "shiftright", "ctrl", "ctrlright", "alt", "altright",
    "f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", "f10", "f11", "f12"
}


_held = set()


def held_keys():
    return sorted(_held)


def hold_key(key, down):
    name = str(key or "").strip().lower()

    if name not in ALLOWED:
        return {"error": "Key not allowed: {0}".format(name or "(none)")}, 400

    if not pyautogui:
        return {"error": "pyautogui not available"}, 500

    try:
        if down:
            pyautogui.keyDown(name)
            _held.add(name)
        else:
            pyautogui.keyUp(name)
            _held.discard(name)
    except Exception as error:
        _held.discard(name)
        return {"error": str(error)}, 500

    return {"key": name, "down": bool(down)}


def release_all():
    """Let go of everything: called when the page hides or the socket drops."""
    released = held_keys()

    if pyautogui:
        for name in released:
            try:
                pyautogui.keyUp(name)
            except Exception:
                pass

    _held.clear()

    return {"released": released}
