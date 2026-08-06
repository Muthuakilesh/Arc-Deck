import psutil

# Only Windows hosts have pywin32; the phone still needs the rest of the API to
# work while developing on Linux, so a missing import degrades to an error
# response instead of a failed boot.
try:
    import win32con
    import win32gui
    import win32process
except (Exception, SystemExit):
    win32con = None
    win32gui = None
    win32process = None


UNSUPPORTED = {"error": "Window control needs Windows"}, 501


def _pids_for(process_name):
    if not process_name:
        return set()

    pids = set()

    for process in psutil.process_iter(["name", "pid"]):
        try:
            name = process.info.get("name") or ""
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue

        if name.lower() == process_name:
            pids.add(process.info["pid"])

    return pids


def _top_level_windows(pids):
    windows = []

    def visit(handle, _):
        if not win32gui.IsWindowVisible(handle) or not win32gui.GetWindowText(handle):
            return

        _, pid = win32process.GetWindowThreadProcessId(handle)

        if pid in pids:
            windows.append(handle)

    win32gui.EnumWindows(visit, None)

    return windows


def focus_window(process_name):
    if not win32gui:
        return UNSUPPORTED

    windows = _top_level_windows(_pids_for(process_name))

    if not windows:
        return {"error": "No window to focus"}, 404

    handle = windows[0]

    try:
        if win32gui.IsIconic(handle):
            win32gui.ShowWindow(handle, win32con.SW_RESTORE)

        win32gui.SetForegroundWindow(handle)
        return {"focused": process_name}
    except Exception as e:
        # SetForegroundWindow is refused unless the caller owns the foreground
        # window, which is common when the request came from the phone.
        return {"error": str(e)}, 500


def close_window(process_name):
    if not win32gui:
        return UNSUPPORTED

    windows = _top_level_windows(_pids_for(process_name))

    if not windows:
        return {"error": "No window to close"}, 404

    # WM_CLOSE lets the app save and prompt; killing the process would not.
    for handle in windows:
        win32gui.PostMessage(handle, win32con.WM_CLOSE, 0, 0)

    return {"closed": process_name, "windows": len(windows)}
