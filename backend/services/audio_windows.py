"""Windows master-volume backend built on pycaw.

COM objects are apartment-bound: every thread that talks to the audio endpoint has
to call CoInitialize first and cannot reuse another thread's interface pointer.
Flask serves each request on a pooled worker thread, so the endpoint is created and
cached per thread here.
"""

import threading

import comtypes
from comtypes import CLSCTX_ALL
from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume


class _ThreadState(threading.local):
    endpoint = None
    com_ready = False


_state = _ThreadState()

name = "windows"


def _endpoint():
    if not _state.com_ready:
        comtypes.CoInitialize()
        _state.com_ready = True

    if _state.endpoint is None:
        speakers = AudioUtilities.GetSpeakers()
        interface = speakers.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
        _state.endpoint = interface.QueryInterface(IAudioEndpointVolume)

    return _state.endpoint


def _call(action):
    """Run action against the endpoint, rebuilding it if Windows invalidated it."""
    try:
        return action(_endpoint())
    except comtypes.COMError:
        _state.endpoint = None
        return action(_endpoint())


def get_state():
    def read(endpoint):
        return {
            "volume": round(endpoint.GetMasterVolumeLevelScalar() * 100),
            "muted": bool(endpoint.GetMute()),
        }

    return _call(read)


def set_level(percent):
    _call(lambda endpoint: endpoint.SetMasterVolumeLevelScalar(percent / 100.0, None))
    return get_state()


def set_mute(muted):
    _call(lambda endpoint: endpoint.SetMute(bool(muted), None))
    return get_state()


def _sessions():
    # Session objects belong to the thread that enumerated them, so they are
    # never cached the way the master endpoint is.
    if not _state.com_ready:
        comtypes.CoInitialize()
        _state.com_ready = True

    for session in AudioUtilities.GetAllSessions():
        if session.Process and session.SimpleAudioVolume:
            yield session


def _describe(session):
    volume = session.SimpleAudioVolume

    return {
        "pid": session.Process.pid,
        "process": session.Process.name(),
        "volume": round(volume.GetMasterVolume() * 100),
        "muted": bool(volume.GetMute())
    }


def get_sessions():
    return [_describe(session) for session in _sessions()]


def _find(pid):
    for session in _sessions():
        if session.Process.pid == pid:
            return session

    return None


def set_session_level(pid, percent):
    session = _find(pid)

    if session is None:
        return None

    session.SimpleAudioVolume.SetMasterVolume(percent / 100.0, None)
    return _describe(session)


def set_session_mute(pid, muted):
    session = _find(pid)

    if session is None:
        return None

    session.SimpleAudioVolume.SetMute(bool(muted), None)
    return _describe(session)
