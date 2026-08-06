import threading
import time

from .stats import get_system_stats


PUSH_INTERVAL = 2


def start_monitor(socketio):
    def loop():
        while True:
            socketio.emit("system_update", get_system_stats())
            time.sleep(PUSH_INTERVAL)

    thread = threading.Thread(target=loop, daemon=True)
    thread.start()
