"""Everything in the Start Menu, searchable from the phone.

apps.json is a curated deck; this is the long tail, so you can start Notepad or
a game you never got round to adding. Shortcuts are indexed once and cached,
and the phone launches by the id of an indexed entry rather than by path, so a
paired phone still cannot ask the PC to run an arbitrary executable.
"""
import hashlib
import os
import subprocess
import time


# Rescanning on every keystroke would hit the disk hard for a list that changes
# when you install something, which is rarely.
CACHE_SECONDS = 300

MAX_RESULTS = 40

WINDOWS_ROOTS = (
    r"%ProgramData%\Microsoft\Windows\Start Menu\Programs",
    r"%APPDATA%\Microsoft\Windows\Start Menu\Programs"
)

LINUX_ROOTS = (
    "/usr/share/applications",
    "~/.local/share/applications"
)

# Uninstallers and help files outnumber the apps in some Start Menus.
SKIP_WORDS = ("uninstall", "readme", "help", "release notes", "documentation", "website")


class _Index(object):
    def __init__(self):
        self.entries = {}
        self.read_at = 0.0


_index = _Index()


def _key(path):
    return hashlib.sha1(path.encode("utf-8", "replace")).hexdigest()[:12]


def _skip(name):
    lowered = name.lower()

    return any(word in lowered for word in SKIP_WORDS)


def _roots():
    if os.name == "nt":
        return [os.path.expandvars(root) for root in WINDOWS_ROOTS]

    return [os.path.expanduser(root) for root in LINUX_ROOTS]


def _suffix():
    return ".lnk" if os.name == "nt" else ".desktop"


def _scan():
    found = {}
    suffix = _suffix()

    for root in _roots():
        if not os.path.isdir(root):
            continue

        for folder, _, files in os.walk(root):
            for filename in files:
                if not filename.lower().endswith(suffix):
                    continue

                name = filename[: -len(suffix)]

                if _skip(name):
                    continue

                path = os.path.join(folder, filename)
                found[_key(path)] = {"name": name, "path": path}

    return found


def _current():
    now = time.time()

    if not _index.entries or now - _index.read_at > CACHE_SECONDS:
        _index.entries = _scan()
        _index.read_at = now

    return _index.entries


def search_shortcuts(query, refresh=False):
    if refresh:
        _index.read_at = 0.0

    words = str(query or "").lower().split()
    results = []

    for entry_id, entry in _current().items():
        lowered = entry["name"].lower()

        if all(word in lowered for word in words):
            results.append({"id": entry_id, "name": entry["name"]})

    # Shorter names are the ones you meant: "Steam" before "Steam Cleanup Tool".
    results.sort(key=lambda item: (len(item["name"]), item["name"].lower()))

    return results[:MAX_RESULTS]


def launch_shortcut(entry_id):
    entry = _current().get(str(entry_id or ""))

    if entry is None:
        return {"error": "Unknown shortcut"}, 404

    try:
        if os.name == "nt":
            os.startfile(entry["path"])
        else:
            subprocess.Popen(["xdg-open", entry["path"]], shell=False)
    except OSError as error:
        return {"error": str(error)}, 500

    return {"opened": entry["name"]}
