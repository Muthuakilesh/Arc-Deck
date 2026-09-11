import json
import os
import tempfile
import unittest

from services import launcher


class CustomGameTest(unittest.TestCase):

    def setUp(self):
        self.original_data = launcher.DATA_FILE
        self.original_custom = launcher.CUSTOM_DATA_FILE
        self.temp_dir = tempfile.TemporaryDirectory()
        launcher.DATA_FILE = os.path.join(self.temp_dir.name, "apps.json")
        launcher.CUSTOM_DATA_FILE = os.path.join(self.temp_dir.name, "custom_apps.json")
        with open(launcher.DATA_FILE, "w", encoding="utf-8") as handle:
            json.dump([{
                "name": "Base Game",
                "path": "C:/Games/base.exe",
                "process": "base.exe",
                "icon": "G",
                "category": "games",
                "actions": []
            }], handle)

    def tearDown(self):
        launcher.DATA_FILE = self.original_data
        launcher.CUSTOM_DATA_FILE = self.original_custom
        self.temp_dir.cleanup()

    def test_custom_game_adds_image_and_survives_reload(self):
        saved = launcher.save_custom_app({
            "name": "New Game",
            "path": "D:/Games/new.exe",
            "process": "new.exe",
            "image": "https://example.com/new.png"
        })

        self.assertEqual("https://example.com/new.png", saved["image"])
        self.assertEqual("games", saved["category"])
        self.assertEqual("New Game", launcher.get_apps()[-1]["name"])
        self.assertEqual("https://example.com/new.png", launcher.find_app("New Game")["image"])

    def test_existing_game_can_override_image_without_changing_catalog(self):
        saved = launcher.save_custom_app({
            "name": "Base Game",
            "image": "/images/ui/base.png"
        })

        self.assertEqual("C:/Games/base.exe", saved["path"])
        self.assertEqual("/images/ui/base.png", launcher.find_app("Base Game")["image"])
        with open(launcher.DATA_FILE, "r", encoding="utf-8") as handle:
            self.assertNotIn("/images/ui/base.png", handle.read())

    def test_invalid_image_scheme_is_rejected(self):
        result = launcher.save_custom_app({
            "name": "Unsafe Game",
            "path": "C:/Games/unsafe.exe",
            "image": "javascript:alert(1)"
        })

        self.assertEqual(400, result[1])


if __name__ == "__main__":
    unittest.main()
