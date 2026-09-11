# pyautogui calls sys.exit() when it cannot find a display/tkinter, so SystemExit
# has to be caught too or importing it takes the whole server down.
import os

try:
    import pyautogui
except (Exception, SystemExit):
    pyautogui = None


def _ensure_cursor_visible():
    """Restore a cursor Windows has hidden while no physical mouse is present."""
    if os.name != "nt":
        return

    try:
        import ctypes
        from ctypes import wintypes

        class CursorInfo(ctypes.Structure):
            _fields_ = [
                ("cbSize", wintypes.DWORD),
                ("flags", wintypes.DWORD),
                ("hCursor", wintypes.HCURSOR),
                ("ptScreenPos", wintypes.POINT),
            ]

        info = CursorInfo()
        info.cbSize = ctypes.sizeof(CursorInfo)
        user32 = ctypes.windll.user32
        # CURSOR_SHOWING is bit 0. ShowCursor's display counter must be
        # non-negative for Windows to draw it.
        if user32.GetCursorInfo(ctypes.byref(info)) and not (info.flags & 1):
            while user32.ShowCursor(True) < 0:
                pass
    except Exception:
        # Cursor visibility is a convenience; a failed restore must never make
        # remote pointer control unavailable.
        pass


if pyautogui:
    # pyautogui sleeps PAUSE seconds after *every* call, 0.1s by default. On a
    # trackpad that is a tenth of a second of lag per movement, and they queue.
    pyautogui.PAUSE = 0
    # The pointer reaching a screen corner would otherwise raise mid-drag.
    pyautogui.FAILSAFE = False


def _unavailable():
    return {"error": "pyautogui not available"}, 500


def move_mouse(x, y):
    if not pyautogui:
        return _unavailable()

    try:
        _ensure_cursor_visible()
        pyautogui.moveRel(x, y, duration=0)
        return {"status": "moved"}
    except Exception as e:
        return {"error": str(e)}, 500


def move_mouse_to(x, y):
    """Jump the pointer to a fraction of the screen, as tapping a still does.

    The screen picture on the phone is scaled, so the phone sends where it
    tapped as 0..1 of the width and height and the PC turns that into pixels.
    """
    try:
        fx = min(max(float(x), 0.0), 1.0)
        fy = min(max(float(y), 0.0), 1.0)
    except (TypeError, ValueError):
        return {"error": "invalid position"}, 400

    if not pyautogui:
        return _unavailable()

    try:
        _ensure_cursor_visible()
        width, height = pyautogui.size()
        pyautogui.moveTo(int(width * fx), int(height * fy), duration=0)
        return {"status": "moved"}
    except Exception as e:
        return {"error": str(e)}, 500


def press_mouse(button, down):
    """Hold or release a button, which is how the phone drags something."""
    if button not in ("left", "right", "middle"):
        return {"error": "invalid button"}, 400

    if not pyautogui:
        return _unavailable()

    try:
        _ensure_cursor_visible()
        if down:
            pyautogui.mouseDown(button=button)
        else:
            pyautogui.mouseUp(button=button)

        return {"status": "down" if down else "up"}
    except Exception as e:
        return {"error": str(e)}, 500


def click_mouse(button):
    if not pyautogui:
        return _unavailable()

    if button not in ("left", "right", "middle"):
        return {"error": "invalid button"}, 400

    try:
        _ensure_cursor_visible()
        pyautogui.click(button=button)
        return {"status": "clicked"}
    except Exception as e:
        return {"error": str(e)}, 500


def scroll_mouse(amount):
    if not pyautogui:
        return _unavailable()

    try:
        _ensure_cursor_visible()
        pyautogui.scroll(int(amount))
        return {"status": "scrolled"}
    except (TypeError, ValueError):
        return {"error": "invalid scroll amount"}, 400
    except Exception as e:
        return {"error": str(e)}, 500
