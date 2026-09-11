"""JPEG stills of the PC screen, small enough for a phone on Wi-Fi.

A 5s is not going to decode 1440p frames, and it does not need to: the deck
wants a glanceable picture you can tap on, so grabs are scaled down hard and
compressed before they leave the PC. Nothing is stored on disk.
"""
import io

try:
    from PIL import Image, ImageGrab
except ImportError:
    Image = None
    ImageGrab = None


# Wide enough to read a window title on a phone, small enough to send often.
DEFAULT_WIDTH = 480
MIN_WIDTH = 160
MAX_WIDTH = 960

DEFAULT_QUALITY = 45
MIN_QUALITY = 15
MAX_QUALITY = 80


class ScreenError(RuntimeError):
    """Raised when the desktop cannot be captured on this machine."""


def _clamp(value, low, high, fallback):
    try:
        number = int(value)
    except (TypeError, ValueError):
        return fallback

    return max(low, min(high, number))


def capture(width=None, quality=None):
    """Return (jpeg_bytes, screen_width, screen_height)."""
    if ImageGrab is None:
        raise ScreenError("Pillow is not installed")

    target = _clamp(width, MIN_WIDTH, MAX_WIDTH, DEFAULT_WIDTH)
    level = _clamp(quality, MIN_QUALITY, MAX_QUALITY, DEFAULT_QUALITY)

    try:
        shot = ImageGrab.grab()
    except Exception as error:
        raise ScreenError(str(error))

    full_width, full_height = shot.size

    if full_width > target:
        height = max(1, int(full_height * target / float(full_width)))
        shot = shot.resize((target, height), Image.BILINEAR)

    buffer = io.BytesIO()
    shot.convert("RGB").save(buffer, format="JPEG", quality=level)

    return buffer.getvalue(), full_width, full_height
