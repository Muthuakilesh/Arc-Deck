# pyautogui calls sys.exit() when it cannot find a display/tkinter, so SystemExit
# has to be caught too or importing it takes the whole server down.
try:
    import pyautogui
except (Exception, SystemExit):
    pyautogui = None


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
        pyautogui.moveRel(x, y, duration=0)
        return {"status": "moved"}
    except Exception as e:
        return {"error": str(e)}, 500


def press_mouse(button, down):
    """Hold or release a button, which is how the phone drags something."""
    if not pyautogui:
        return _unavailable()

    if button not in ("left", "right", "middle"):
        return {"error": "invalid button"}, 400

    try:
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
        pyautogui.click(button=button)
        return {"status": "clicked"}
    except Exception as e:
        return {"error": str(e)}, 500


def scroll_mouse(amount):
    if not pyautogui:
        return _unavailable()

    try:
        pyautogui.scroll(int(amount))
        return {"status": "scrolled"}
    except (TypeError, ValueError):
        return {"error": "invalid scroll amount"}, 400
    except Exception as e:
        return {"error": str(e)}, 500
