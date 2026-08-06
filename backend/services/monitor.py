import time
import threading

from .stats import get_system_stats


def start_monitor(socketio):
    def loop():
        while True:
            stats = get_system_stats()
            socketio.emit(
                "system_update",
                stats
            )
            time.sleep(1)

    thread = threading.Thread(
        target=loop,
        daemon=True
    )
    thread.start()
