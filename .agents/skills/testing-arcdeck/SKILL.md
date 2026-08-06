---
name: testing-arcdeck
description: How to run and end-to-end test the Arc-Deck phone-remote app (Flask backend + vanilla ES-module frontend) locally, including PIN pairing, the volume slider, and phone-sized viewport testing.
---

# Testing Arc-Deck locally

## Run the app

```bash
cd /path/to/Arc-Deck/backend
ARCDECK_PIN=1234 ../.venv/bin/python app.py     # serves API *and* frontend on :5000
```

- A venv with requirements may already exist at `./.venv`; otherwise
  `python3 -m venv .venv && .venv/bin/pip install -r backend/requirements.txt`.
- `ARCDECK_PIN` overrides the generated PIN and **wipes existing tokens**, so every run starts unpaired if
  the PIN changed. The PIN is also printed at startup (`ArcDeck pairing PIN: ....`).
- Pairing state lives in `backend/data/auth.json` (`{"pin": ..., "tokens": [...]}`). Delete it before a run to
  guarantee a first-load PIN screen. Note the process caches this config in memory, so editing the file while
  the server runs has no effect — use the HTTP endpoints instead (below).
- Only one process may hold port 5000. After `pkill -f app.py`, wait ~2s before restarting or the new process
  dies with "Address already in use". Start it detached (`setsid nohup ... > /tmp/arcdeck.log 2>&1 &`) and use
  `/tmp/arcdeck.log` — the Werkzeug request log there is excellent evidence (e.g. counting
  `POST /api/audio/volume` calls to prove a throttled sender).

## Platform expectations (do not report as regressions)

- On Linux/macOS the audio backend falls back to `backend/services/audio_dummy.py`: `GET /api/status` returns
  `"audio":"dummy"` and audio responses include `"simulated": true`. Real Windows audio (pycaw,
  `audio_windows.py`) can only be verified on the PC.
- pyautogui is unavailable off Windows, so mouse/keyboard/media/power actions are inert.

## Auth model (needed for auth tests)

- `POST /api/auth/login {"pin": "..."}` → `{"token": ...}`; the browser stores it in `localStorage` under
  `arcdeck.token` and sends it as the `X-ArcDeck-Token` header. `before_request` guards all `/api/*` except
  `/api/status`, `/api/auth/session`, `/api/auth/login`. The socket connect handler needs the same token.
- To test "token invalid" without touching the server: set `localStorage['arcdeck.token']` to garbage and
  reload → PIN screen.
- To test "revoked mid-session" (stronger): grab the token from `backend/data/auth.json` and
  `curl -X POST localhost:5000/api/auth/logout -H "X-ArcDeck-Token: $T"`, then act in the UI — the 401 should
  bring the PIN card back.

## UI map (where things actually are)

- Dock has 7 pages: home, apps, games, media, control, stats, clock (`frontend/components/dock.js`).
- The volume card can appear on **Home, Control and Media** (as of commit `95e79b0`; earlier `views/home.js`
  imported `VolumeControl` but never appended it — check the view file if it seems missing). On Control you
  must scroll the `#app-view` area to the bottom to reach it, on Home a short scroll is enough.
- Multiple volume cards can be mounted at once across page navigations; when testing sync, set a value on one
  page, navigate, and compare — they should agree in both directions.
- Volume card selectors: `[data-slider]`, `[data-value]`, `[data-mute]`, `[data-adjust]`
  (`frontend/components/volumeControl.js`).
- `frontend/js/main.js` renders startup errors into an `.error-overlay`, so a blank/overlay screen usually
  means a module-level JS error — check the console first.

## Phone-sized (320x568) viewport testing

Chrome enforces a **~500px minimum window width**, so `wmctrl -r :ACTIVE: -e 0,0,0,336,650` will NOT give you
a 320px viewport. Use DevTools device emulation instead: maximize the window, `F12`, `ctrl+shift+m`, then type
`320` and `568` into the Dimensions width/height fields in the device toolbar.

## Testing the slider (drag) properly

The `computer` tool's `left_mouse_down` takes **no coordinate** — `mouse_move` to the thumb first, then
`left_mouse_down`, then several `mouse_move` steps, and take a screenshot **while still held** to prove the
readout/filled-track update live (the whole point of the `input`-vs-`change` fix). Release with
`left_mouse_up`. Prove persistence by reloading the page: the card re-renders from `GET /api/audio`.

## Known rough edges you may re-encounter

- The `.widgets` row overflows at 320px (`scrollWidth` ~343 inside ~288) so the third card (Disk) is clipped
  and unreachable; the Stats grid clips its third column too. Layout redesign is tracked separately.
- The topbar status text used to stay on "Connecting…" after navigation because `TopBar()` is rebuilt per page
  and only updated on the socket `connection` event; it now seeds from `state.connected`. If you see
  "Connecting…" after navigating, that regression is back.
- After a re-login, already-mounted components (e.g. the volume card) used to keep a stale optimistic value /
  `PIN required` text until remounted. `auth.js` now emits `auth:paired`, which `volumeControl.js` and
  `websocket.js` listen for. If a stale value reappears, check that those listeners still exist; verifying
  true state on a freshly mounted card (navigate away and back) is a good cross-check either way.

## Proving the stats socket is really alive (not the HTTP fallback)

`frontend/js/system.js` only issues its 5s `GET /api/system` poll when `!state.connected`. So "CPU/RAM keep
changing" alone is not proof of a live socket. Confirm in `/tmp/arcdeck*.log` that:

- a fresh `GET /socket.io/?EIO=4&transport=polling...` handshake with a **new `sid`** appears right after
  `POST /api/auth/login` (that is the reconnect-with-new-token path), and
- there are **no** `GET /api/system` lines afterwards while the UI keeps updating.

This is the cleanest evidence for re-pair/socket-reconnect scenarios.

## Devin secrets needed

None — everything runs locally and the PIN is set via `ARCDECK_PIN`.
