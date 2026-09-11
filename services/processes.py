import os
import time

import psutil

from .window_control import foreground


# Scanning every process is the expensive part of an app poll, so the phone and
# the socket broadcast share one snapshot instead of walking the table twice.
CACHE_TTL = 2.0

_cache = {"at": 0.0, "names": frozenset()}


def _snapshot():
    now = time.time()

    if now - _cache["at"] < CACHE_TTL:
        return _cache["names"]

    names = set()

    for process in psutil.process_iter(["name"]):
        try:
            name = process.info.get("name")
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue

        if name:
            names.add(name.lower())

    _cache["at"] = now
    _cache["names"] = frozenset(names)

    return _cache["names"]


def process_name_for(app):
    """The executable an app is expected to show up as in the process table."""
    explicit = app.get("process")

    if explicit:
        return str(explicit).lower()

    path = app.get("path") or ""

    if not path:
        return ""

    # Windows paths do not split on this host's separator, so do it by hand.
    leaf = path.replace("\\", "/").rsplit("/", 1)[-1]
    stem, extension = os.path.splitext(leaf)

    # A .lnk only names the shortcut, never the process it starts.
    if extension.lower() == ".lnk":
        return ""

    return (stem + ".exe").lower() if extension else ""


def is_running(app):
    name = process_name_for(app)

    return bool(name) and name in _snapshot()


def app_for_process(apps, process_name):
    """The configured app a raw executable name belongs to, if any."""
    if not process_name:
        return None

    for app in apps:
        if process_name_for(app) == process_name.lower():
            return app.get("name")

    return None


def foreground_state(apps):
    """What the user is looking at, named as one of their configured apps."""
    window = foreground()

    if not window:
        return None

    return dict(window, app=app_for_process(apps, window.get("process")))


def running_names(apps):
    snapshot = _snapshot()

    return [
        app.get("name")
        for app in apps
        if process_name_for(app) in snapshot and process_name_for(app)
    ]
