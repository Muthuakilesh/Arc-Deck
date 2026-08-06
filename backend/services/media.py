try:
    import pyautogui
except Exception:
    pyautogui = None


def get_media():

    return {

        "title":
        "No media detected",

        "artist":
        "",

        "playing":
        False

    }




def media_action(action):

    if not action:
        return {"error": "invalid action"}, 400

    action = str(action).lower()
    key_map = {
        "play": "playpause",
        "pause": "playpause",
        "playpause": "playpause",
        "next": "nexttrack",
        "nexttrack": "nexttrack",
        "previous": "prevtrack",
        "prev": "prevtrack",
        "prevtrack": "prevtrack",
        "mute": "volumemute",
        "volumeup": "volumeup",
        "volumedown": "volumedown",
    }
    key = key_map.get(action)
    if not key:
        return {"error": "invalid action"}, 400

    if not pyautogui:
        return {"error": "pyautogui not available"}, 500

    try:
        pyautogui.press(key)
        return {"action": action, "status": "sent"}
    except Exception as e:
        return {"error": str(e)}, 500
