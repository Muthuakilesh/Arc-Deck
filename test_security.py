"""Security-focused checks for auth token lifecycle and error envelope shape.

Run from the backend directory: python -m unittest test_security
"""

import os
import tempfile
import time
import unittest

from routes._errors import envelope, error_response
from services import auth


class AuthServiceSecurityTest(unittest.TestCase):

    def setUp(self):
        self.original_data_file = auth.DATA_FILE
        self.original_config = auth._config
        self.original_pin = os.environ.get("ARCDECK_PIN")
        self.original_ttl = os.environ.get("ARCDECK_TOKEN_TTL_DAYS")

        self.temp_dir = tempfile.TemporaryDirectory()
        auth.DATA_FILE = os.path.join(self.temp_dir.name, "auth.json")
        auth._config = None

        os.environ["ARCDECK_PIN"] = "1234"
        os.environ["ARCDECK_TOKEN_TTL_DAYS"] = "2"

    def tearDown(self):
        self.temp_dir.cleanup()

        auth.DATA_FILE = self.original_data_file
        auth._config = self.original_config

        if self.original_pin is None:
            os.environ.pop("ARCDECK_PIN", None)
        else:
            os.environ["ARCDECK_PIN"] = self.original_pin

        if self.original_ttl is None:
            os.environ.pop("ARCDECK_TOKEN_TTL_DAYS", None)
        else:
            os.environ["ARCDECK_TOKEN_TTL_DAYS"] = self.original_ttl

    def test_login_creates_expiring_token_record(self):
        token = auth.login("1234")

        self.assertIsInstance(token, str)
        self.assertTrue(token)

        config = auth._load()
        self.assertEqual(1, len(config["tokens"]))

        record = config["tokens"][0]
        self.assertEqual(token, record["token"])
        self.assertGreater(record["expires_at"], record["issued_at"])

    def test_is_valid_token_prunes_expired_records(self):
        now = int(time.time())
        auth._config = {
            "pin": "1234",
            "tokens": [
                {"token": "expired", "issued_at": now - 100, "expires_at": now - 1},
                {"token": "alive", "issued_at": now - 10, "expires_at": now + 100}
            ]
        }

        self.assertFalse(auth.is_valid_token("expired"))
        self.assertTrue(auth.is_valid_token("alive"))

        tokens = auth._config["tokens"]
        self.assertEqual(1, len(tokens))
        self.assertEqual("alive", tokens[0]["token"])

    def test_legacy_string_tokens_still_validate(self):
        auth._config = {"pin": "1234", "tokens": ["legacy-token"]}

        self.assertTrue(auth.is_valid_token("legacy-token"))
        self.assertIsInstance(auth._config["tokens"][0], dict)
        self.assertIn("expires_at", auth._config["tokens"][0])


class ErrorEnvelopeTest(unittest.TestCase):

    def test_error_response_shape(self):
        body, status = error_response("Bad request", status=400, code="ERR_BAD", details={"field": "pin"})

        self.assertEqual(400, status)
        self.assertFalse(body["success"])
        self.assertEqual("Bad request", body["error"])
        self.assertEqual("ERR_BAD", body["code"])
        self.assertIn("timestamp", body)
        self.assertEqual({"field": "pin"}, body["details"])

    def test_envelope_wraps_service_error(self):
        body, status = envelope(({"error": "Nope"}, 503), default_code="ERR_FALLBACK")

        self.assertEqual(503, status)
        self.assertFalse(body["success"])
        self.assertEqual("Nope", body["error"])
        self.assertEqual("ERR_FALLBACK", body["code"])
        self.assertIn("timestamp", body)

    def test_envelope_passes_success_response_through(self):
        body, status = envelope(({"ok": True}, 200))

        self.assertEqual(200, status)
        self.assertEqual({"ok": True}, body)


if __name__ == "__main__":
    unittest.main()
