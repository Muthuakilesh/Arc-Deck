"""Local, bounded activity history for explainable ArcDeck suggestions."""

import json
import os
import sqlite3
import threading
import uuid
from contextlib import closing
from datetime import datetime, timedelta, timezone


DATA_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "activity.db"))
DEFAULT_RETENTION_DAYS = 30
DEFAULT_MAX_EVENTS = 5000
ALLOWED_TYPES = {
    "app.launch",
    "app.focus",
    "app.close",
    "app.action",
    "scene.started",
    "scene.step",
    "scene.completed",
    "scene.failed",
    "scene.cancelled",
    "suggestion.shown",
    "suggestion.accepted",
    "suggestion.dismissed",
    "focus.started",
    "focus.paused",
    "focus.completed",
    "focus.ended",
}
ALLOWED_OUTCOMES = {"started", "success", "failed", "cancelled", "shown", "accepted", "dismissed"}
ALLOWED_CONTEXT = {"foreground_app", "time_band", "scene_id", "run_id", "step", "duration_seconds"}
_lock = threading.RLock()


def _connect():
    directory = os.path.dirname(DATA_FILE)
    os.makedirs(directory, exist_ok=True)
    connection = sqlite3.connect(DATA_FILE, timeout=5)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA journal_mode=WAL")
    connection.execute("PRAGMA foreign_keys=ON")
    _migrate(connection)
    return connection


def _migrate(connection):
    connection.executescript(
        """
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS events (
            id TEXT PRIMARY KEY,
            at TEXT NOT NULL,
            type TEXT NOT NULL,
            subject TEXT NOT NULL,
            action TEXT NOT NULL,
            source TEXT NOT NULL,
            outcome TEXT NOT NULL,
            context TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_events_at ON events(at DESC);
        CREATE INDEX IF NOT EXISTS idx_events_type_subject ON events(type, subject, at DESC);
        """
    )
    defaults = {
        "history_enabled": "1",
        "suggestions_enabled": "1",
        "retention_days": str(DEFAULT_RETENTION_DAYS),
        "max_events": str(DEFAULT_MAX_EVENTS),
    }
    connection.executemany(
        "INSERT OR IGNORE INTO settings(key, value) VALUES (?, ?)",
        defaults.items(),
    )
    connection.commit()


def _clean_text(value, limit=80):
    text = str(value or "").strip()
    return text[:limit]


def _bounded_int(value, low, high, label):
    try:
        number = int(value)
    except (TypeError, ValueError):
        raise ValueError("Invalid {0}".format(label))
    return max(low, min(high, number))


def _time_band(moment):
    hour = moment.hour
    if hour < 6:
        return "late_night"
    if hour < 12:
        return "morning"
    if hour < 18:
        return "afternoon"
    return "evening"


def get_settings():
    with _lock:
        with closing(_connect()) as connection:
            rows = connection.execute("SELECT key, value FROM settings").fetchall()
    values = {row["key"]: row["value"] for row in rows}
    return {
        "history_enabled": values.get("history_enabled", "1") == "1",
        "suggestions_enabled": values.get("suggestions_enabled", "1") == "1",
        "retention_days": max(1, min(365, int(values.get("retention_days", DEFAULT_RETENTION_DAYS)))),
        "max_events": max(100, min(50000, int(values.get("max_events", DEFAULT_MAX_EVENTS)))),
    }


def update_settings(values):
    current = get_settings()
    if "history_enabled" in values:
        current["history_enabled"] = bool(values["history_enabled"])
    if "suggestions_enabled" in values:
        current["suggestions_enabled"] = bool(values["suggestions_enabled"])
    if "retention_days" in values:
        current["retention_days"] = _bounded_int(values["retention_days"], 1, 365, "retention days")
    if "max_events" in values:
        current["max_events"] = _bounded_int(values["max_events"], 100, 50000, "event limit")

    stored = {
        "history_enabled": "1" if current["history_enabled"] else "0",
        "suggestions_enabled": "1" if current["suggestions_enabled"] else "0",
        "retention_days": str(current["retention_days"]),
        "max_events": str(current["max_events"]),
    }
    with _lock:
        with closing(_connect()) as connection:
            connection.executemany(
                "INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                stored.items(),
            )
            connection.commit()
    prune()
    return current


def record_event(event_type, subject="", action="", source="", outcome="success", context=None):
    if event_type not in ALLOWED_TYPES:
        raise ValueError("Unsupported activity event")
    settings = get_settings()
    if not settings["history_enabled"]:
        return None

    now = datetime.now(timezone.utc)
    safe_context = {"time_band": _time_band(now)}
    for key, value in (context or {}).items():
        if key in ALLOWED_CONTEXT and value is not None:
            safe_context[key] = _clean_text(value, 120)

    event = {
        "version": 1,
        "id": uuid.uuid4().hex,
        "at": now.isoformat(),
        "type": event_type,
        "subject": _clean_text(subject),
        "action": _clean_text(action),
        "source": _clean_text(source),
        "outcome": outcome if outcome in ALLOWED_OUTCOMES else "failed",
        "context": safe_context,
    }
    with _lock:
        with closing(_connect()) as connection:
            connection.execute(
                "INSERT INTO events(id, at, type, subject, action, source, outcome, context) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    event["id"], event["at"], event["type"], event["subject"],
                    event["action"], event["source"], event["outcome"], json.dumps(event["context"]),
                ),
            )
            connection.commit()
    prune(settings)
    return event


def prune(settings=None):
    settings = settings or get_settings()
    cutoff = (datetime.now(timezone.utc) - timedelta(days=settings["retention_days"])).isoformat()
    with _lock:
        with closing(_connect()) as connection:
            connection.execute("DELETE FROM events WHERE at < ?", (cutoff,))
            connection.execute(
                "DELETE FROM events WHERE id IN (SELECT id FROM events ORDER BY at DESC LIMIT -1 OFFSET ?)",
                (settings["max_events"],),
            )
            connection.commit()


def _row_to_event(row):
    return {
        "version": 1,
        "id": row["id"],
        "at": row["at"],
        "type": row["type"],
        "subject": row["subject"],
        "action": row["action"],
        "source": row["source"],
        "outcome": row["outcome"],
        "context": json.loads(row["context"] or "{}"),
    }


def get_events(limit=100, event_type=None):
    count = _bounded_int(limit, 1, 1000, "event limit")
    query = "SELECT * FROM events"
    values = []
    if event_type:
        query += " WHERE type = ?"
        values.append(event_type)
    query += " ORDER BY at DESC LIMIT ?"
    values.append(count)
    with _lock:
        with closing(_connect()) as connection:
            rows = connection.execute(query, values).fetchall()
    return [_row_to_event(row) for row in rows]


def get_summary(days=7):
    window = _bounded_int(days, 1, 90, "summary days")
    cutoff = (datetime.now(timezone.utc) - timedelta(days=window)).isoformat()
    with _lock:
        with closing(_connect()) as connection:
            totals = connection.execute(
                "SELECT type, subject, action, COUNT(*) AS count, MAX(at) AS last_at "
                "FROM events WHERE at >= ? AND outcome = 'success' "
                "GROUP BY type, subject, action ORDER BY count DESC, last_at DESC LIMIT 50",
                (cutoff,),
            ).fetchall()
            total_events = connection.execute("SELECT COUNT(*) AS count FROM events WHERE at >= ?", (cutoff,)).fetchone()["count"]
    return {
        "days": window,
        "total_events": total_events,
        "top": [dict(row) for row in totals],
        "settings": get_settings(),
    }


def get_suggestions():
    settings = get_settings()
    if not settings["suggestions_enabled"]:
        return []

    events = list(reversed(get_events(1000)))
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    parsed = []
    for event in events:
        try:
            moment = datetime.fromisoformat(event["at"].replace("Z", "+00:00"))
        except (TypeError, ValueError):
            continue
        if moment >= cutoff:
            parsed.append((moment, event))

    dismissed = {
        event["subject"]
        for moment, event in parsed
        if event["type"] == "suggestion.dismissed"
        and event["action"] == "dismiss"
        and moment >= datetime.now(timezone.utc) - timedelta(days=7)
    }
    suppressed = {
        event["subject"]
        for _, event in parsed
        if event["type"] == "suggestion.dismissed" and event["action"] == "suppress"
    }
    suggestions = []

    current_band = _time_band(datetime.now())
    scene_days = {}
    for moment, event in parsed:
        if event["type"] != "scene.completed" or event["context"].get("time_band") != current_band:
            continue
        scene_days.setdefault(event["subject"], set()).add(moment.date().isoformat())
    for scene, days in scene_days.items():
        suggestion_id = "recurring-scene:" + scene.lower()
        if len(days) >= 4 and suggestion_id not in dismissed and suggestion_id not in suppressed:
            suggestions.append({
                "id": suggestion_id,
                "type": "recurring_scene",
                "scene": scene,
                "reason": "Used in this time period on {0} days".format(len(days)),
                "evidence": len(days),
            })

    launch_windows = {}
    by_day = {}
    for moment, event in parsed:
        if event["type"] == "app.launch" and event["outcome"] == "success":
            by_day.setdefault(moment.date().isoformat(), []).append((moment, event["subject"]))
    for day, launches in by_day.items():
        for index, (started, _) in enumerate(launches):
            apps = sorted({name for moment, name in launches[index:] if (moment - started).total_seconds() <= 600 and name})
            if 2 <= len(apps) <= 4:
                launch_windows.setdefault(tuple(apps), set()).add(day)
    for apps, days in launch_windows.items():
        suggestion_id = "app-group:" + "+".join(item.lower() for item in apps)
        if len(days) >= 3 and suggestion_id not in dismissed and suggestion_id not in suppressed:
            suggestions.append({
                "id": suggestion_id,
                "type": "app_group",
                "apps": list(apps),
                "reason": "Launched together on {0} days".format(len(days)),
                "evidence": len(days),
            })

    action_pairs = {}
    action_events = [(moment, event) for moment, event in parsed if event["type"] == "app.action" and event["outcome"] == "success"]
    for index in range(len(action_events) - 1):
        first_time, first = action_events[index]
        second_time, second = action_events[index + 1]
        if first_time.date() != second_time.date() or (second_time - first_time).total_seconds() > 600:
            continue
        pair = ((first["subject"], first["action"]), (second["subject"], second["action"]))
        action_pairs.setdefault(pair, set()).add(first_time.date().isoformat())
    for pair, days in action_pairs.items():
        suggestion_id = "action-pair:" + "+".join("{0}:{1}".format(*item).lower() for item in pair)
        if len(days) >= 3 and suggestion_id not in dismissed and suggestion_id not in suppressed:
            suggestions.append({
                "id": suggestion_id,
                "type": "action_sequence",
                "actions": [{"app": item[0], "action": item[1]} for item in pair],
                "reason": "Repeated in sequence on {0} days".format(len(days)),
                "evidence": len(days),
            })

    suggestions.sort(key=lambda item: item["evidence"], reverse=True)
    return suggestions[:3]


def clear_events():
    with _lock:
        with closing(_connect()) as connection:
            deleted = connection.execute("SELECT COUNT(*) AS count FROM events").fetchone()["count"]
            connection.execute("DELETE FROM events")
            connection.commit()
    return deleted