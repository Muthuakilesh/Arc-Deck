import os
import time

import psutil


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


def running_names(apps):
    snapshot = _snapshot()

    return [
        app.get("name")
        for app in apps
        if process_name_for(app) in snapshot and process_name_for(app)
    ]
