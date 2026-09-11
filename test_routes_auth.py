"""Route-level auth guard and envelope integration tests.

Run from backend directory:
    python -m unittest test_routes_auth

If Flask is not installed in the current environment, these tests are skipped.
"""

import unittest

try:
    from flask import Flask
    from routes import auth as auth_routes
except ImportError:
    Flask = None
    auth_routes = None


@unittest.skipUnless(Flask is not None and auth_routes is not None, "Flask not installed in this environment")
class AuthRouteIntegrationTest(unittest.TestCase):

    def setUp(self):
        self.original_login = auth_routes.login
        self.original_is_valid_token = auth_routes.is_valid_token

        self.original_api_max = auth_routes.API_MAX_REQUESTS
        self.original_api_window = auth_routes.API_WINDOW_SECONDS

        auth_routes._login_attempts.clear()
        auth_routes._api_counts.clear()

        self.app = Flask(__name__)
        self.app.testing = True
        self.app.register_blueprint(auth_routes.auth_bp, url_prefix="/api/auth")

        @self.app.route("/api/protected", methods=["GET"])
        def protected():
            return {"ok": True}

        self.app.before_request(auth_routes.require_token)
        self.client = self.app.test_client()

    def tearDown(self):
        auth_routes.login = self.original_login
        auth_routes.is_valid_token = self.original_is_valid_token

        auth_routes.API_MAX_REQUESTS = self.original_api_max
        auth_routes.API_WINDOW_SECONDS = self.original_api_window

        auth_routes._login_attempts.clear()
        auth_routes._api_counts.clear()

    def test_login_lockout_returns_envelope(self):
        auth_routes.login = lambda pin: None

        response = None
        for _ in range(auth_routes.LOGIN_MAX_ATTEMPTS + 1):
            response = self.client.post("/api/auth/login", json={"pin": "0000"}, environ_base={"REMOTE_ADDR": "10.0.0.8"})

        self.assertIsNotNone(response)
        self.assertEqual(429, response.status_code)

        body = response.get_json()
        self.assertFalse(body["success"])
        self.assertEqual("ERR_LOGIN_RATE_LIMIT", body["code"])
        self.assertIn("retry_after", body.get("details", {}))

    def test_auth_required_error_envelope(self):
        auth_routes.is_valid_token = lambda token: False

        response = self.client.get("/api/protected", environ_base={"REMOTE_ADDR": "10.0.0.9"})

        self.assertEqual(401, response.status_code)

        body = response.get_json()
        self.assertFalse(body["success"])
        self.assertEqual("ERR_AUTH_REQUIRED", body["code"])
        self.assertIn("timestamp", body)

    def test_rate_limit_error_envelope(self):
        auth_routes.is_valid_token = lambda token: False
        auth_routes.API_MAX_REQUESTS = 2
        auth_routes.API_WINDOW_SECONDS = 120

        self.client.get("/api/protected", environ_base={"REMOTE_ADDR": "10.0.0.10"})
        self.client.get("/api/protected", environ_base={"REMOTE_ADDR": "10.0.0.10"})
        response = self.client.get("/api/protected", environ_base={"REMOTE_ADDR": "10.0.0.10"})

        self.assertEqual(429, response.status_code)

        body = response.get_json()
        self.assertFalse(body["success"])
        self.assertEqual("ERR_RATE_LIMIT", body["code"])
        self.assertIn("retry_after", body.get("details", {}))


if __name__ == "__main__":
    unittest.main()
