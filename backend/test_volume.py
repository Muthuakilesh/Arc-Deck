"""Platform-agnostic checks for the volume service.

Run from the backend directory: python -m unittest test_volume
On Windows this exercises the real pycaw endpoint; elsewhere the simulated backend.
"""

import unittest

from services.volume import (
    AudioError,
    adjust_volume,
    get_volume,
    set_mute,
    set_volume,
    toggle_mute
)


class VolumeServiceTest(unittest.TestCase):

    def setUp(self):
        try:
            self.original = get_volume()
        except AudioError as error:
            self.skipTest("no audio endpoint available: {0}".format(error))

    def tearDown(self):
        set_volume(self.original["volume"])
        set_mute(self.original["muted"])

    def test_state_shape(self):
        state = get_volume()
        self.assertIsInstance(state["volume"], int)
        self.assertIsInstance(state["muted"], bool)

    def test_set_volume_round_trips(self):
        self.assertEqual(set_volume(42)["volume"], 42)

    def test_set_volume_clamps(self):
        self.assertEqual(set_volume(180)["volume"], 100)
        self.assertEqual(set_volume(-20)["volume"], 0)

    def test_set_volume_rejects_garbage(self):
        with self.assertRaises(ValueError):
            set_volume("loud")

    def test_adjust_is_relative(self):
        set_volume(50)
        self.assertEqual(adjust_volume(-15)["volume"], 35)

    def test_toggle_mute_flips(self):
        set_mute(False)
        self.assertTrue(toggle_mute()["muted"])
        self.assertFalse(toggle_mute()["muted"])


if __name__ == "__main__":
    unittest.main()
