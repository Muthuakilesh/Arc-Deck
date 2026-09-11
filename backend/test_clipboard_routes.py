import unittest

from flask import Flask

from routes import clipboard as clipboard_routes


class ClipboardRouteTest(unittest.TestCase):

    def setUp(self):
        self.original_read = clipboard_routes.read_text
        self.original_write = clipboard_routes.write_text
        self.app = Flask(__name__)
        self.app.testing = True
        self.app.register_blueprint(clipboard_routes.clipboard_bp, url_prefix="/api/clipboard")
        self.client = self.app.test_client()

    def tearDown(self):
        clipboard_routes.read_text = self.original_read
        clipboard_routes.write_text = self.original_write

    def test_read_and_write_are_enveloped_without_logging_content(self):
        clipboard_routes.read_text = lambda: {"text": "line 1\n\u2603"}
        clipboard_routes.write_text = lambda text: {"written": len(text)}

        read = self.client.get("/api/clipboard")
        write = self.client.post("/api/clipboard", json={"text": "line 1\n\u2603"})

        self.assertEqual("line 1\n\u2603", read.get_json()["text"])
        self.assertEqual(8, write.get_json()["written"])


if __name__ == "__main__":
    unittest.main()