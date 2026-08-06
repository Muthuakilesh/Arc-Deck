import threading
import time

from .launcher import get_apps
from .processes import running_names
from .stats import get_system_stats


PUSH_INTERVAL = 2

# Walking the process table is far heavier than reading CPU/RAM, and apps do not
# come and go every two seconds.
APPS_EVERY = 3


def start_monitor(socketio):
    def loop():
        tick = 0

        while True:
            socketio.emit("system_update", get_system_stats())

            if tick % APPS_EVERY == 0:
                socketio.emit("apps_update", {"running": running_names(get_apps())})

            tick += 1
            time.sleep(PUSH_INTERVAL)

    thread = threading.Thread(target=loop, daemon=True)
    thread.start()
