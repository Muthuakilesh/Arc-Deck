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
