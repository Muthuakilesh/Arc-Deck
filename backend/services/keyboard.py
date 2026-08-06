try:
    import pyautogui
except Exception:
    pyautogui = None


def type_text(text):
    if not text:
        return {"error": "no text provided"}, 400

    if not pyautogui:
        return {"error": "pyautogui not available"}, 500

    try:
        pyautogui.write(str(text), interval=0.02)
        return {"typed": str(text)}
    except Exception as e:
        return {"error": str(e)}, 500


def press_hotkey(*keys):
    if not keys:
        return {"error": "no hotkey provided"}, 400

    if not pyautogui:
        return {"error": "pyautogui not available"}, 500

    try:
        pyautogui.hotkey(*keys)
        return {"hotkey": "+".join(keys)}
    except Exception as e:
        return {"error": str(e)}, 500
     