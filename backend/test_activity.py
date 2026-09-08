import os
import sqlite3
import tempfile
import unittest
from datetime import datetime, timedelta, timezone

from services import activity


class ActivityServiceTest(unittest.TestCase):

    def setUp(self):
        self.original_data_file = activity.DATA_FILE
        self.temp_dir = tempfile.TemporaryDirectory()
        activity.DATA_FILE = os.path.join(self.temp_dir.name, "activity.db")

    def tearDown(self):
        activity.DATA_FILE = self.original_data_file
        self.temp_dir.cleanup()

    def test_records_only_allowlisted_context(self):
        event = activity.record_event(
            "app.action",
            subject="VSCode",
            action="toggle-terminal",
            source="home.focus",
            context={"foreground_app": "VSCode", "typed_text": "secret", "url": "example.com"},
        )

        self.assertIsNotNone(event)
        self.assertEqual("VSCode", event["context"]["foreground_app"])
        self.assertNotIn("typed_text", event["context"])
        self.assertNotIn("url", event["context"])

    def test_disabled_history_does_not_record(self):
        activity.update_settings({"history_enabled": False})

        result = activity.record_event("app.launch", subject="Chrome")

        self.assertIsNone(result)
        self.assertEqual([], activity.get_events())

    def test_summary_groups_successful_events(self):
        activity.record_event("app.launch", subject="Chrome")
        activity.record_event("app.launch", subject="Chrome")
        activity.record_event("app.launch", subject="VSCode", outcome="failed")

        summary = activity.get_summary(7)

        self.assertEqual(3, summary["total_events"])
        self.assertEqual("Chrome", summary["top"][0]["subject"])
        self.assertEqual(2, summary["top"][0]["count"])

    def test_accept_feedback_is_recorded(self):
        activity.record_event(
            "suggestion.accepted",
            subject="app-group:chrome+vscode",
            action="run",
            source="home.context",
            outcome="accepted",
        )

        event = activity.get_events(1)[0]

        self.assertEqual("suggestion.accepted", event["type"])
        self.assertEqual("app-group:chrome+vscode", event["subject"])
        self.assertEqual("accepted", event["outcome"])

    def test_clear_events_returns_deleted_count(self):
        activity.record_event("scene.completed", subject="Work")

        self.assertEqual(1, activity.clear_events())
        self.assertEqual([], activity.get_events())

    def test_invalid_numeric_settings_are_rejected(self):
        with self.assertRaisesRegex(ValueError, "retention days"):
            activity.update_settings({"retention_days": "forever"})

    def test_repeated_app_group_requires_three_separate_days(self):
        event_ids = []
        for _ in range(3):
            event_ids.append(activity.record_event("app.launch", subject="Chrome")["id"])
            event_ids.append(activity.record_event("app.launch", subject="VSCode")["id"])

        connection = sqlite3.connect(activity.DATA_FILE)
        for day in range(3):
            moment = datetime.now(timezone.utc) - timedelta(days=day)
            connection.execute("UPDATE events SET at = ? WHERE id IN (?, ?)", (moment.isoformat(), event_ids[day * 2], event_ids[day * 2 + 1]))
        connection.commit()
        connection.close()

        suggestions = activity.get_suggestions()

        group = next(item for item in suggestions if item["type"] == "app_group")
        self.assertEqual(["Chrome", "VSCode"], group["apps"])
        self.assertEqual(3, group["evidence"])

        activity.record_event(
            "suggestion.dismissed",
            subject=group["id"],
            action="dismiss",
            outcome="dismissed",
        )
        self.assertFalse(any(item["id"] == group["id"] for item in activity.get_suggestions()))

    def test_permanent_suppression_targets_only_one_recommendation(self):
        event_ids = []
        for _ in range(3):
            event_ids.append(activity.record_event("app.launch", subject="Chrome")["id"])
            event_ids.append(activity.record_event("app.launch", subject="VSCode")["id"])
            event_ids.append(activity.record_event("app.launch", subject="Discord")["id"])

        connection = sqlite3.connect(activity.DATA_FILE)
        for day in range(3):
            moment = datetime.now(timezone.utc) - timedelta(days=day)
            connection.execute("UPDATE events SET at = ? WHERE id IN (?, ?, ?)", (moment.isoformat(), *event_ids[day * 3:day * 3 + 3]))
        connection.commit()
        connection.close()

        suggestions = activity.get_suggestions()
        target = next(item for item in suggestions if item["type"] == "app_group" and item["apps"] == ["Chrome", "Discord", "VSCode"])
        activity.record_event("suggestion.dismissed", subject=target["id"], action="suppress", outcome="dismissed")

        remaining = activity.get_suggestions()

        self.assertFalse(any(item["id"] == target["id"] for item in remaining))
        self.assertTrue(any(item["type"] == "app_group" for item in remaining))


if __name__ == "__main__":
    unittest.main()