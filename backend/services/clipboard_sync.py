"""Authenticated in-memory clipboard synchronization for connected ArcDeck clients."""

import os
import threading
import time

from .clipboard import MAX_TEXT, read_text, write_text


class ClipboardSync:
    def __init__(self, reader=read_text, writer=write_text):
        self._reader = reader
        self._writer = writer
        self._lock = threading.RLock()
        self._clients = {}
        self._text = None
        self._version = 0
        self._initialized = False
        self._monitor_thread = None
        self._monitor_stop = None
        self._emit = None

    def configure_emitter(self, emit):
        self._emit = emit

    def _snapshot(self, include_text=True):
        result = {
            "version": self._version,
            "available": self._text is not None,
            "source": "sync",
        }
        if include_text:
            result["text"] = self._text or ""
        return result

    def _ensure_baseline(self):
        if self._initialized:
            return
        result = self._reader()
        text = result.get("text", "") if isinstance(result, dict) and not result.get("error") else ""
        with self._lock:
            self._text = str(text)[:MAX_TEXT]
            self._initialized = True
            self._version = 1

    def connect(self, sid, enabled=False):
        with self._lock:
            self._clients[sid] = bool(enabled)
            if enabled:
                self._ensure_baseline()
                self._start_monitor_locked()
            return self._snapshot()

    def disconnect(self, sid):
        with self._lock:
            self._clients.pop(sid, None)
            if not any(self._clients.values()):
                self._stop_monitor_locked()

    def set_enabled(self, sid, enabled):
        with self._lock:
            if sid not in self._clients:
                return {"error": "Clipboard sync session is not connected"}, 403
            self._clients[sid] = bool(enabled)
            if enabled:
                self._ensure_baseline()
                self._start_monitor_locked()
            elif not any(self._clients.values()):
                self._stop_monitor_locked()
            return self._snapshot()

    def phone_update(self, sid, text):
        if not isinstance(text, str):
            return {"error": "Clipboard text must be a string"}, 400
        if len(text) > MAX_TEXT:
            return {"error": "Clipboard text is too long"}, 400
        with self._lock:
            if not self._clients.get(sid):
                return {"error": "Clipboard sync is disabled"}, 403
            self._text = text
            self._version += 1
            snapshot = self._snapshot()
        result = self._writer(text)
        if isinstance(result, tuple) and result[1] >= 400:
            return result
        self._broadcast(snapshot)
        return snapshot

    def pc_update(self, text):
        if not isinstance(text, str) or len(text) > MAX_TEXT:
            return
        with self._lock:
            if not any(self._clients.values()):
                return
            if self._initialized and text == self._text:
                return
            self._initialized = True
            self._text = text
            self._version += 1
            snapshot = self._snapshot()
        self._broadcast(snapshot)

    def _broadcast(self, snapshot):
        if not self._emit:
            return
        with self._lock:
            targets = [sid for sid, enabled in self._clients.items() if enabled]
        for sid in targets:
            self._emit("clipboard_state", snapshot, to=sid)

    def _start_monitor_locked(self):
        if self._monitor_thread and self._monitor_thread.is_alive():
            return
        stop = threading.Event()
        self._monitor_stop = stop
        self._monitor_thread = threading.Thread(target=self._monitor, args=(stop,), name="arcdeck-clipboard", daemon=True)
        self._monitor_thread.start()

    def _stop_monitor_locked(self):
        if self._monitor_stop:
            self._monitor_stop.set()

    def _monitor(self, stop):
        try:
            if os.name == "nt" and self._windows_monitor(stop):
                return

            # Linux/test fallback only. Windows uses WM_CLIPBOARDUPDATE above.
            last = None
            while not stop.wait(1.0):
                result = self._reader()
                if not isinstance(result, dict) or result.get("error"):
                    continue
                text = str(result.get("text", ""))[:MAX_TEXT]
                if text != last:
                    last = text
                    self.pc_update(text)
        finally:
            with self._lock:
                if self._monitor_stop is stop:
                    self._monitor_thread = None
                    self._monitor_stop = None

    def _windows_monitor(self, stop):
        try:
            import win32api
            import win32con
            import win32gui
        except ImportError:
            return False

        try:
            message = 0x031D  # WM_CLIPBOARDUPDATE
            class_name = "ArcDeckClipboardListener"

            def handle(_hwnd, msg, _wparam, _lparam):
                if msg == message:
                    result = self._reader()
                    if isinstance(result, dict) and not result.get("error"):
                        self.pc_update(str(result.get("text", ""))[:MAX_TEXT])
                return win32gui.DefWindowProc(_hwnd, msg, _wparam, _lparam)

            window_class = win32gui.WNDCLASS()
            window_class.lpfnWndProc = handle
            window_class.lpszClassName = class_name
            try:
                win32gui.RegisterClass(window_class)
            except win32gui.error:
                pass
            hwnd = win32gui.CreateWindowEx(
                0, class_name, "ArcDeck clipboard listener", 0,
                0, 0, 0, 0, win32con.HWND_MESSAGE, 0, 0, None
            )
            win32gui.AddClipboardFormatListener(hwnd)
            while not stop.is_set():
                win32gui.PumpWaitingMessages()
                time.sleep(0.05)
            win32gui.RemoveClipboardFormatListener(hwnd)
            win32gui.DestroyWindow(hwnd)
            return True
        except Exception:
            return False


sync = ClipboardSync()
