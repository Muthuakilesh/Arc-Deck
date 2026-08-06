import logging
import os

from . import audio_dummy


log = logging.getLogger(__name__)


class AudioError(RuntimeError):
    """Raised when the platform audio endpoint cannot be reached."""


def _select_backend():
    if os.name != "nt":
        return audio_dummy

    try:
        from . import audio_windows

        return audio_windows
    except ImportError as error:
        log.warning("Windows audio backend unavailable (%s); using simulated volume", error)
        return audio_dummy


backend = _select_backend()


def _clamp(value, label):
    try:
        number = float(value)
    except (TypeError, ValueError):
        raise ValueError("Invalid {0}".format(label))

    return max(0.0, min(100.0, number))


def get_volume():
    try:
        return backend.get_state()
    except Exception as error:
        raise AudioError(str(error))


def set_volume(value):
    percent = _clamp(value, "volume value")

    try:
        return backend.set_level(percent)
    except Exception as error:
        raise AudioError(str(error))


def adjust_volume(delta):
    try:
        change = float(delta)
    except (TypeError, ValueError):
        raise ValueError("Invalid volume delta")

    return set_volume(get_volume()["volume"] + change)


def set_mute(muted):
    try:
        return backend.set_mute(muted)
    except Exception as error:
        raise AudioError(str(error))


def toggle_mute():
    return set_mute(not get_volume()["muted"])


class SessionMissing(LookupError):
    """The app stopped playing audio between the phone reading it and writing it."""


def get_sessions():
    try:
        return backend.get_sessions()
    except Exception as error:
        raise AudioError(str(error))


def _pid(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        raise ValueError("Invalid session id")


def set_session_volume(pid, value):
    number = _pid(pid)
    percent = _clamp(value, "volume value")

    try:
        session = backend.set_session_level(number, percent)
    except Exception as error:
        raise AudioError(str(error))

    if session is None:
        raise SessionMissing("That app is no longer playing audio")

    return session


def set_session_mute(pid, muted):
    number = _pid(pid)

    try:
        session = backend.set_session_mute(number, bool(muted))
    except Exception as error:
        raise AudioError(str(error))

    if session is None:
        raise SessionMissing("That app is no longer playing audio")

    return session
