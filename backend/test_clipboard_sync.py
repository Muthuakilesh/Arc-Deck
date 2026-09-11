import unittest

from services.clipboard import MAX_TEXT
from services.clipboard_sync import ClipboardSync


class ClipboardSyncTest(unittest.TestCase):

    def setUp(self):
        self.pc_text = "initial"
        self.writes = []
        self.events = []

        def reader():
            return {"text": self.pc_text}

        def writer(text):
            self.writes.append(text)
            self.pc_text = text
            return {"written": len(text)}

        self.sync = ClipboardSync(reader, writer)
        self.sync.configure_emitter(lambda event, data, to: self.events.append((event, data, to)))

    def tearDown(self):
        if self.sync._monitor_stop:
            self.sync._monitor_stop.set()

    def test_initial_connect_establishes_baseline_without_writing_pc(self):
        state = self.sync.connect("phone", True)

        self.assertEqual("initial", state["text"])
        self.assertEqual([], self.writes)
        self.assertEqual([], self.events)

    def test_phone_update_writes_pc_and_broadcasts_once(self):
        self.sync.connect("phone", True)

        result = self.sync.phone_update("phone", "line 1\n\u2603")

        self.assertEqual("line 1\n\u2603", self.pc_text)
        self.assertEqual(["line 1\n\u2603"], self.writes)
        self.assertEqual(1, len(self.events))
        self.assertEqual(result["version"], self.events[0][1]["version"])

    def test_pc_change_broadcasts_but_same_content_is_ignored(self):
        self.sync.connect("phone", True)

        self.sync.pc_update("new")
        self.sync.pc_update("new")

        self.assertEqual(1, len(self.events))
        self.assertEqual("new", self.events[0][1]["text"])

    def test_disabled_client_cannot_update_and_disconnect_stops_access(self):
        self.sync.connect("phone", False)

        self.assertEqual(403, self.sync.phone_update("phone", "blocked")[1])
        self.sync.disconnect("phone")
        self.assertEqual(403, self.sync.phone_update("phone", "blocked")[1])

    def test_oversized_text_is_rejected_without_writing(self):
        self.sync.connect("phone", True)

        result = self.sync.phone_update("phone", "x" * (MAX_TEXT + 1))

        self.assertEqual(400, result[1])
        self.assertEqual([], self.writes)


if __name__ == "__main__":
    unittest.main()