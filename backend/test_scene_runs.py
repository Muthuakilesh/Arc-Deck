import json
import os
import tempfile
import time
import unittest

from services import activity, scenes


class SceneRunTest(unittest.TestCase):

    def setUp(self):
        self.original_scene_file = scenes.DATA_FILE
        self.original_activity_file = activity.DATA_FILE
        self.temp_dir = tempfile.TemporaryDirectory()
        scenes.DATA_FILE = os.path.join(self.temp_dir.name, "scenes.json")
        activity.DATA_FILE = os.path.join(self.temp_dir.name, "activity.db")
        with open(scenes.DATA_FILE, "w", encoding="utf-8") as handle:
            json.dump([
                {
                    "id": "delayed",
                    "name": "Delayed",
                    "icon": "D",
                    "pinned": False,
                    "steps": [{"delay": 1000}]
                }
            ], handle)

    def tearDown(self):
        scenes.DATA_FILE = self.original_scene_file
        activity.DATA_FILE = self.original_activity_file
        self.temp_dir.cleanup()

    def test_async_run_can_cancel_during_delay(self):
        started = scenes.start_scene("delayed")
        run_id = started["run_id"]

        deadline = time.time() + 1
        while time.time() < deadline:
            current = scenes.get_run(run_id)
            if current and current["status"] == "running":
                break
            time.sleep(0.01)

        self.assertTrue(scenes.cancel_run(run_id))

        deadline = time.time() + 1
        while time.time() < deadline:
            current = scenes.get_run(run_id)
            if current and current["status"] == "cancelled":
                break
            time.sleep(0.01)

        self.assertEqual("cancelled", current["status"])
        history = scenes.get_run_history()
        self.assertEqual("scene.cancelled", history[0]["type"])
        self.assertEqual(run_id, history[0]["context"]["run_id"])

    def test_sync_run_remains_compatible_and_adds_run_id(self):
        with open(scenes.DATA_FILE, "w", encoding="utf-8") as handle:
            json.dump([
                {
                    "id": "instant",
                    "name": "Instant",
                    "icon": "I",
                    "pinned": False,
                    "steps": [{"delay": 0}]
                }
            ], handle)

        result = scenes.run_scene("instant")

        self.assertEqual("Instant", result["ran"])
        self.assertTrue(result["run_id"])
        self.assertEqual("completed", scenes.get_run(result["run_id"])["status"])

    def test_typed_focus_step_is_versioned_and_returns_directive(self):
        saved = scenes.save_scene({
            "name": "Focus",
            "steps": [{"type": "focus_timer", "seconds": 1500, "label": "Deep work"}]
        })

        result = scenes.run_scene(saved["id"])

        self.assertEqual(2, saved["version"])
        self.assertEqual("focus_timer", result["directives"][0]["type"])
        self.assertEqual(1500, result["directives"][0]["seconds"])

    def test_typed_audio_rejects_non_numeric_volume(self):
        with self.assertRaisesRegex(scenes.SceneError, "Master volume"):
            scenes.save_scene({
                "name": "Bad audio",
                "steps": [{"type": "audio_master", "volume": "loud"}]
            })


if __name__ == "__main__":
    unittest.main()
