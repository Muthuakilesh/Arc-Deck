"""Route-level envelope integration tests for scenes and screen endpoints.

Run from backend directory:
    python -m unittest test_routes_envelope

If Flask is not installed in the current environment, these tests are skipped.
"""

import unittest

try:
    from flask import Flask
    from routes import scenes as scenes_routes
    from routes import screen as screen_routes
except ImportError:
    Flask = None
    scenes_routes = None
    screen_routes = None


@unittest.skipUnless(
    Flask is not None and scenes_routes is not None and screen_routes is not None,
    "Flask not installed in this environment"
)
class EnvelopeRouteIntegrationTest(unittest.TestCase):

    def setUp(self):
        self.original_save_scene = scenes_routes.save_scene
        self.original_delete_scene = scenes_routes.delete_scene
        self.original_run_scene = scenes_routes.run_scene

        self.original_capture = screen_routes.capture
        self.original_move_mouse_to = screen_routes.move_mouse_to
        self.original_click_mouse = screen_routes.click_mouse

        self.app = Flask(__name__)
        self.app.testing = True
        self.app.register_blueprint(scenes_routes.scenes_bp, url_prefix="/api/scenes")
        self.app.register_blueprint(screen_routes.screen_bp, url_prefix="/api/screen")
        self.client = self.app.test_client()

    def tearDown(self):
        scenes_routes.save_scene = self.original_save_scene
        scenes_routes.delete_scene = self.original_delete_scene
        scenes_routes.run_scene = self.original_run_scene

        screen_routes.capture = self.original_capture
        screen_routes.move_mouse_to = self.original_move_mouse_to
        screen_routes.click_mouse = self.original_click_mouse

    def test_scene_save_validation_envelope(self):
        def broken_save(_):
            raise scenes_routes.SceneError("Bad scene")

        scenes_routes.save_scene = broken_save

        response = self.client.post("/api/scenes", json={})

        self.assertEqual(400, response.status_code)

        body = response.get_json()
        self.assertFalse(body["success"])
        self.assertEqual("ERR_SCENE_VALIDATION", body["code"])
        self.assertEqual("Bad scene", body["error"])

    def test_scene_delete_not_found_envelope(self):
        scenes_routes.delete_scene = lambda _scene_id: False

        response = self.client.delete("/api/scenes/unknown")

        self.assertEqual(404, response.status_code)

        body = response.get_json()
        self.assertFalse(body["success"])
        self.assertEqual("ERR_SCENE_NOT_FOUND", body["code"])

    def test_scene_run_envelope(self):
        scenes_routes.run_scene = lambda _scene_id: ({"error": "step failed", "step": 2}, 500)

        response = self.client.post("/api/scenes/x/run", json={})

        self.assertEqual(500, response.status_code)

        body = response.get_json()
        self.assertFalse(body["success"])
        self.assertEqual("ERR_SCENE_RUN", body["code"])
        self.assertEqual("step failed", body["error"])

    def test_screen_capture_envelope(self):
        def broken_capture(_w, _q):
            raise screen_routes.ScreenError("no display")

        screen_routes.capture = broken_capture

        response = self.client.get("/api/screen")

        self.assertEqual(503, response.status_code)

        body = response.get_json()
        self.assertFalse(body["success"])
        self.assertEqual("ERR_SCREEN_CAPTURE", body["code"])

    def test_screen_tap_move_error_envelope(self):
        screen_routes.move_mouse_to = lambda _x, _y: ({"error": "invalid position"}, 400)
        screen_routes.click_mouse = lambda _button: {"status": "clicked"}

        response = self.client.post("/api/screen/tap", json={"x": "nope", "y": 0.2})

        self.assertEqual(400, response.status_code)

        body = response.get_json()
        self.assertFalse(body["success"])
        self.assertEqual("ERR_SCREEN_TAP", body["code"])
        self.assertEqual("invalid position", body["error"])


if __name__ == "__main__":
    unittest.main()
