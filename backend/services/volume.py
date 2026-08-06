from pycaw.pycaw import (
    AudioUtilities,
    IAudioEndpointVolume
)


from ctypes import POINTER

from comtypes import CLSCTX_ALL




def get_endpoint():


    devices = AudioUtilities.GetSpeakers()

    # The object returned by GetSpeakers() should expose an Activate method
    # but some environments or pycaw versions may return a wrapper without
    # that attribute. Try several fallbacks and provide a clear error.
    activate_target = None

    if hasattr(devices, 'Activate'):
        activate_target = devices
    else:
        # try treating it as a sequence (some wrappers return a single-item list)
        try:
            if len(devices) > 0:
                candidate = devices[0]
                if hasattr(candidate, 'Activate'):
                    activate_target = candidate
        except Exception:
            pass

        # try common attribute names for underlying COM object
        if activate_target is None:
            for attr in ('_device', 'Device', '_obj_', 'mmdevice'):
                try:
                    candidate = getattr(devices, attr, None)
                    if candidate is not None and hasattr(candidate, 'Activate'):
                        activate_target = candidate
                        break
                except Exception:
                    continue

    if activate_target is None:
        # Many pycaw builds expose a higher-level AudioDevice object that
        # already provides an `EndpointVolume` attribute implementing the
        # volume API. Prefer that when available.
        try:
            all_devices = AudioUtilities.GetAllDevices()
            for d in all_devices:
                try:
                    if hasattr(d, 'EndpointVolume'):
                        return d.EndpointVolume
                except Exception:
                    continue
        except Exception:
            pass

        # Try enumerating all devices and activate the first that supports Activate
        try:
            all_devices = AudioUtilities.GetAllDevices()
            for d in all_devices:
                try:
                    if hasattr(d, 'Activate'):
                        interface = d.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
                        return interface.QueryInterface(IAudioEndpointVolume)
                except Exception:
                    continue
        except Exception:
            pass

        raise RuntimeError('Could not obtain audio endpoint object. Check pycaw installation and Windows audio APIs.')

    # If we have a raw underlying COM device that supports Activate, use it
    interface = activate_target.Activate(
        IAudioEndpointVolume._iid_,
        CLSCTX_ALL,
        None
    )

    return interface.QueryInterface(
        IAudioEndpointVolume
    )





def get_volume():


    endpoint=get_endpoint()


    level=endpoint.GetMasterVolumeLevelScalar()


    mute=endpoint.GetMute()



    return {

        "volume":
        round(level*100),

        "muted":
        bool(mute)

    }





def set_volume(value):
    endpoint = get_endpoint()

    # coerce to float and clamp to [0,100]
    try:
        v = float(value)
    except Exception:
        raise ValueError("Invalid volume value")

    v = max(0.0, min(100.0, v))

    endpoint.SetMasterVolumeLevelScalar(v / 100.0, None)

    return get_volume()





def toggle_mute():


    endpoint=get_endpoint()


    current=endpoint.GetMute()


    endpoint.SetMute(
        not current,
        None
    )


    return get_volume()


def adjust_volume(delta):
    """Move the master volume relative to its live Windows value."""
    try:
        change = float(delta)
    except (TypeError, ValueError):
        raise ValueError("Invalid volume delta")

    current = get_volume()["volume"]
    return set_volume(current + change)
