# pyautogui calls sys.exit() when it cannot find a display/tkinter, so SystemExit
# has to be caught too or importing it takes the whole server down.
try:
    import pyautogui
except (Exception, SystemExit):
    pyautogui = None

try:
    from services.media_windows import get_media as get_windows_media
    from services.media_windows import media_action as windows_media_action
except (ImportError, OSError, Exception):
    get_windows_media = None
    windows_media_action = None

from services import chrome_media


def get_media():
    chrome_state = chrome_media.get_media()
    if chrome_state:
        return chrome_state

    if get_windows_media:
        try:
            return get_windows_media()
        except Exception:
            pass

    return {

        "title":
        "No media detected",

        "artist":
        "",

        "playing": False,
        "position": 0,
        "duration": 0,
        "can_seek": False

    }




def media_action(action, position=None):

    if not action:
        return {"error": "invalid action"}, 400

    action = str(action).lower()
    if action == "seek":
        if position is None:
            return {"error": "position is required"}, 400
        try:
            position = float(position)
        except (TypeError, ValueError):
            return {"error": "position must be a number"}, 400

    chrome_actions = {"play", "pause", "playpause", "next", "nexttrack", "previous", "prev", "prevtrack", "seek"}
    if action in chrome_actions and chrome_media.queue_action(action, position):
        result = {"action": action, "status": "queued"}
        if position is not None:
            result["position"] = float(position)
        return result

    if action == "seek":
        if windows_media_action:
            try:
                if windows_media_action(action, position):
                    return {"action": action, "position": float(position), "status": "sent"}
            except Exception:
                pass
        return {"error": "media seeking is not available"}, 503

    if windows_media_action and action in {"play", "pause", "playpause", "next", "nexttrack", "previous", "prev", "prevtrack"}:
        try:
            if windows_media_action("playpause" if action in {"play", "pause", "playpause"} else action):
                return {"action": action, "status": "sent"}
        except Exception:
            pass

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
