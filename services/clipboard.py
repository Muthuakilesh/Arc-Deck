import ctypes
import os
import time


MAX_TEXT = 100000
CF_UNICODETEXT = 13
GMEM_MOVEABLE = 0x0002


def _windows_api():
    if os.name != "nt":
        return None

    user32 = ctypes.windll.user32
    kernel32 = ctypes.windll.kernel32
    user32.OpenClipboard.argtypes = [ctypes.c_void_p]
    user32.OpenClipboard.restype = ctypes.c_bool
    user32.GetClipboardData.argtypes = [ctypes.c_uint]
    user32.GetClipboardData.restype = ctypes.c_void_p
    user32.SetClipboardData.argtypes = [ctypes.c_uint, ctypes.c_void_p]
    user32.SetClipboardData.restype = ctypes.c_void_p
    kernel32.GlobalAlloc.argtypes = [ctypes.c_uint, ctypes.c_size_t]
    kernel32.GlobalAlloc.restype = ctypes.c_void_p
    kernel32.GlobalLock.argtypes = [ctypes.c_void_p]
    kernel32.GlobalLock.restype = ctypes.c_void_p
    kernel32.GlobalUnlock.argtypes = [ctypes.c_void_p]
    kernel32.GlobalUnlock.restype = ctypes.c_bool
    kernel32.GlobalFree.argtypes = [ctypes.c_void_p]
    return user32, kernel32


def read_text():
    api = _windows_api()
    if api is None:
        return {"error": "Clipboard is available on Windows only"}, 503

    user32, kernel32 = api
    for _ in range(5):
        if user32.OpenClipboard(None):
            break
        time.sleep(0.02)
    else:
        return {"error": "The Windows clipboard is busy"}, 409

    try:
        if not user32.IsClipboardFormatAvailable(CF_UNICODETEXT):
            return {"text": ""}
        handle = user32.GetClipboardData(CF_UNICODETEXT)
        if not handle:
            return {"text": ""}
        pointer = kernel32.GlobalLock(handle)
        if not pointer:
            return {"error": "Could not read the Windows clipboard"}, 500
        try:
            raw = ctypes.wstring_at(pointer, MAX_TEXT + 1)
            text = raw.split("\x00", 1)[0]
            return {"text": text[:MAX_TEXT]}
        finally:
            kernel32.GlobalUnlock(handle)
    finally:
        user32.CloseClipboard()


def write_text(value):
    api = _windows_api()
    if api is None:
        return {"error": "Clipboard is available on Windows only"}, 503

    text = str(value or "")
    if len(text) > MAX_TEXT:
        return {"error": "Clipboard text is too long"}, 400

    user32, kernel32 = api
    for _ in range(5):
        if user32.OpenClipboard(None):
            break
        time.sleep(0.02)
    else:
        return {"error": "The Windows clipboard is busy"}, 409

    buffer = ctypes.create_unicode_buffer(text)
    handle = None
    try:
        handle = kernel32.GlobalAlloc(GMEM_MOVEABLE, ctypes.sizeof(buffer))
        if not handle:
            return {"error": "Could not allocate clipboard memory"}, 500
        pointer = kernel32.GlobalLock(handle)
        if not pointer:
            kernel32.GlobalFree(handle)
            handle = None
            return {"error": "Could not write the Windows clipboard"}, 500
        ctypes.memmove(pointer, ctypes.addressof(buffer), ctypes.sizeof(buffer))
        kernel32.GlobalUnlock(handle)
        if not user32.EmptyClipboard() or not user32.SetClipboardData(CF_UNICODETEXT, handle):
            kernel32.GlobalFree(handle)
            handle = None
            return {"error": "Could not write the Windows clipboard"}, 500
        handle = None
        return {"written": len(text)}
    finally:
        if handle:
            kernel32.GlobalFree(handle)
        user32.CloseClipboard()