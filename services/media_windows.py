"""Windows Global System Media Transport Controls adapter.

Chrome exposes YouTube, Spotify Web Player, and other browser playback through
this Windows media-session API. The adapter stays optional so Arc-Deck keeps its
keyboard fallback on systems without a media session or WinRT projection.
"""

import asyncio
from datetime import timedelta

from winrt.windows.media.control import (
    GlobalSystemMediaTransportControlsSessionManager as MediaManager,
    GlobalSystemMediaTransportControlsSessionPlaybackStatus as PlaybackStatus,
)


def _seconds(value):
    if value is None:
        return 0.0
    if isinstance(value, timedelta):
        return value.total_seconds()
    return float(value) / 10_000_000


def _run(coroutine):
    return asyncio.run(coroutine)


async def _session():
    manager = await MediaManager.request_async()
    return manager.get_current_session() if manager else None


async def _read():
    session = await _session()
    if session is None:
        return {
            "title": "No active media",
            "artist": "",
            "playing": False,
            "position": 0,
            "duration": 0,
            "can_seek": False,
        }

    properties = await session.try_get_media_properties_async()
    timeline = session.get_timeline_properties()
    playback = session.get_playback_info()
    status = playback.playback_status if playback else None
    controls = playback.controls if playback else None
    duration = max(0.0, _seconds(timeline.end_time - timeline.start_time))
    position = max(0.0, _seconds(timeline.position - timeline.start_time))

    return {
        "title": properties.title or "Unknown track",
        "artist": properties.artist or properties.album_artist or "",
        "album": properties.album_title or "",
        "playing": status == PlaybackStatus.PLAYING,
        "position": min(position, duration) if duration else position,
        "duration": duration,
        # A duration alone does not mean a browser/player accepts seeks.  In
        # particular, live streams expose a timeline while rejecting position
        # changes, so use the capability reported by Windows as well.
        "can_seek": bool(controls and controls.is_playback_position_enabled) and duration > 0,
        "source": "windows-media-session",
    }


async def _action(action, position=None):
    session = await _session()
    if session is None:
        return False

    if action == "playpause":
        playback = session.get_playback_info()
        status = playback.playback_status if playback else None
        return await (session.try_pause_async() if status == PlaybackStatus.PLAYING else session.try_play_async())
    if action == "nexttrack":
        return await session.try_skip_next_async()
    if action == "prevtrack":
        return await session.try_skip_previous_async()
    if action == "seek":
        return await session.try_change_playback_position_async(timedelta(seconds=float(position)))
    return False


def get_media():
    return _run(_read())


def media_action(action, position=None):
    return _run(_action(action, position))
