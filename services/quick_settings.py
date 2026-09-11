"""Windows quick-settings controls with fixed, non-shell-interpolated commands."""

import os
import re
import subprocess


def _powershell(script):
    completed = subprocess.run(
        [
            "powershell",
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            script,
        ],
        capture_output=True,
        text=True,
        timeout=12,
    )

    if completed.returncode:
        message = (
            completed.stderr
            or completed.stdout
            or "Windows rejected the command"
        ).strip()

        raise RuntimeError(message)

    return completed.stdout.strip()


def _adapter_state():
    completed = subprocess.run(
        ["netsh", "interface", "show", "interface"],
        capture_output=True,
        text=True,
        timeout=12,
    )

    if completed.returncode:
        raise RuntimeError(
            (completed.stderr or "Could not read network interfaces").strip()
        )

    for line in completed.stdout.splitlines():
        if re.search(r"\bwi-?fi\b|\bwireless\b", line, re.IGNORECASE):
            # The first column is the adapter's admin state, so an enabled
            # but temporarily disconnected Wi-Fi card still displays as On.
            return line.lstrip().lower().startswith("enabled")

    raise RuntimeError("No Wi-Fi adapter found")


def _bluetooth_adapter():
    """
    Find the physical Bluetooth radio.

    This intentionally ignores:
      - BTHENUM devices
      - BTHLE devices
      - Microsoft Bluetooth Enumerators
      - Bluetooth services
      - Paired Bluetooth devices

    For the current PC this resolves to:
        Intel(R) Wireless Bluetooth(R)
    """

    script = r"""
$adapter = Get-PnpDevice -Class Bluetooth |
    Where-Object {
        $_.Present -eq $true -and
        $_.FriendlyName -eq 'Intel(R) Wireless Bluetooth(R)'
    } |
    Select-Object -First 1

if (-not $adapter) {
    throw 'Intel Bluetooth adapter not found'
}

$adapter.InstanceId
"""

    instance_id = _powershell(script).strip()

    if not instance_id:
        raise RuntimeError("Bluetooth adapter not found")

    return instance_id


def _bluetooth_state():
    """
    Read the state of the physical Intel Bluetooth radio.
    """

    script = r"""
$adapter = Get-PnpDevice -Class Bluetooth |
    Where-Object {
        $_.Present -eq $true -and
        $_.FriendlyName -eq 'Intel(R) Wireless Bluetooth(R)'
    } |
    Select-Object -First 1

if (-not $adapter) {
    throw 'Intel Bluetooth adapter not found'
}

if ($adapter.Status -eq 'OK') {
    'ON'
}
else {
    'OFF'
}
"""

    return _powershell(script).strip().upper() == "ON"


def get_state():
    if os.name != "nt":
        return {
            "available": False,
            "reason": "Windows quick settings are only available on Windows.",
        }

    state = {
        "available": True,
        "wifi": None,
        "bluetooth": None,
    }

    for name, reader in (
        ("wifi", _adapter_state),
        ("bluetooth", _bluetooth_state),
    ):
        try:
            state[name] = reader()
        except (
            OSError,
            RuntimeError,
            subprocess.SubprocessError,
        ):
            state[name] = None

    return state


def _set_wifi(enabled):
    command = "enabled" if enabled else "disabled"

    completed = subprocess.run(
        [
            "netsh",
            "interface",
            "set",
            "interface",
            "name=Wi-Fi",
            "admin={0}".format(command),
        ],
        capture_output=True,
        text=True,
        timeout=12,
    )

    if completed.returncode:
        raise RuntimeError(
            (
                completed.stderr
                or completed.stdout
                or "Windows rejected the Wi-Fi change"
            ).strip()
        )


def _set_bluetooth(enabled):
    """
    Enable or disable the physical Intel Bluetooth adapter.

    Uses pnputil instead of Disable-PnpDevice because
    Disable-PnpDevice is returning HRESULT 0x80041001
    on this machine.
    """

    instance_id = _bluetooth_adapter()

    command = "/enable-device" if enabled else "/disable-device"

    completed = subprocess.run(
        [
            "pnputil",
            command,
            instance_id,
        ],
        capture_output=True,
        text=True,
        timeout=15,
    )

    if completed.returncode:
        message = (
            completed.stderr
            or completed.stdout
            or "Windows rejected the Bluetooth change"
        ).strip()

        raise RuntimeError(message)

    # Give Windows a moment to update the PnP state and then read it again.
    state = _bluetooth_state()

    return state


SETTINGS_URIS = {
    "network": "ms-settings:network-wifi",
    "bluetooth": "ms-settings:bluetooth",
    "display": "ms-settings:display",
    "focus": "ms-settings:quiethours",
    "power": "ms-settings:powersleep",
}


def action(name, enabled=None):
    if os.name != "nt":
        return {
            "error": "Windows quick settings are only available on Windows."
        }, 503

    try:
        if name == "wifi":
            _set_wifi(bool(enabled))

            return {
                "action": name,
                "enabled": bool(enabled),
            }

        if name == "bluetooth":
            state = _set_bluetooth(bool(enabled))

            return {
                "action": name,
                "enabled": state,
            }

        if name == "panel":
            from .keyboard import press_hotkey

            return press_hotkey("win", "a")

        if name in SETTINGS_URIS:
            os.startfile(SETTINGS_URIS[name])

            return {
                "action": name,
                "status": "opened",
            }

    except (
        OSError,
        RuntimeError,
        subprocess.SubprocessError,
    ) as error:
        return {
            "error": str(error),
        }, 503

    return {
        "error": "Unknown quick setting",
    }, 400