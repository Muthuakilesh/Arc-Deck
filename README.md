# Arc-Deck

A phone-sized control deck for a Windows PC. Run the server on the PC, open it
from the phone on the same network, pair once with the PIN the server prints.

```bash
cd backend
pip install -r requirements.txt
python app.py            # prints the pairing PIN, serves the UI on :5000
```

Set `ARCDECK_PIN` to choose the PIN yourself.

## Frontend styling

The UI is still plain ES modules with no bundler — Tailwind is only a CSS
compile step, not a framework migration. After changing Tailwind classes in
`frontend/`, rebuild the generated stylesheet so the change actually ships:

```bash
npm install
npm run build:css      # or: npm run watch:css
```

`frontend/css/tailwind.generated.css` is committed, since the Flask server has
no build step of its own — forgetting to rebuild leaves it stale.

## Security controls

Arc-Deck now includes baseline API hardening for LAN deployments:

- Login brute-force protection: after repeated bad PIN attempts from one client,
  login is locked for a short period.
- Token expiry: pairing tokens expire automatically (default 30 days).
- API request throttling: protects against request floods on high-cost endpoints.
- Origin checks: `/api/*` and Socket.IO connections reject disallowed origins.

Optional environment variables:

- `ARCDECK_TOKEN_TTL_DAYS` — token lifetime in days (default `30`).
- `ARCDECK_ALLOWED_ORIGINS` — comma-separated extra allowed origins,
  for example `https://deck.example.com,http://192.168.1.44:5000`.

## App actions

Everything the deck can do to an app is declared in `backend/data/apps.json`.
The phone can only ask for commands that appear there, plus the three built-ins
(`launch`, `focus`, `close`) — an action that is not declared is refused, so a
paired phone cannot type arbitrary keys on the desktop.

```json
{
  "name": "Chrome",
  "path": "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "process": "chrome.exe",
  "icon": "🌐",
  "category": "apps",
  "actions": [
    { "label": "New tab", "command": "hotkey:ctrl+t" },
    { "label": "Open YouTube", "command": ["focus", "hotkey:ctrl+t", "delay:250", "type:youtube.com", "hotkey:enter"] }
  ]
}
```

| command | does |
| --- | --- |
| `launch` | starts `path` |
| `focus` | brings the app's window to the front |
| `close` | asks the app's windows to close (`WM_CLOSE`, so it can still prompt to save) |
| `hotkey:ctrl+shift+m` | presses a shortcut |
| `type:some text` | types text |
| `media:play` | play/pause, next, previous, … |
| `delay:250` | waits, in milliseconds (max 2000) |

A `command` may be a list, and the steps run in order until one fails — that is
how a macro like the YouTube one above is written.

`process` is the executable the app shows up as in Task Manager; it is what the
deck watches to show an app as running, and what `focus` and `close` act on. If
it is left out it is guessed from `path`, which does not work for `.lnk`
shortcuts.

## Scenes

A scene is one button that runs a sequence across several apps, and unlike
`apps.json` it is built on the phone (More → Scenes) and stored in
`backend/data/scenes.json`. Legacy steps can use an app action or a pause. The
editor also supports typed intention steps for waiting for an app, changing
master/app audio, and starting a Focus timer:

```json
{
  "id": "a146e4cf",
  "name": "Game night",
  "icon": "⚡",
  "pinned": true,
  "steps": [
    { "app": "Discord", "command": "hotkey:ctrl+shift+m", "label": "Mute" },
    { "delay": 500 },
    { "app": "Elden Ring", "command": "launch" },
    { "type": "wait_for_app", "app": "Elden Ring", "timeout": 5000 },
    { "type": "audio_master", "volume": 60 },
    { "type": "focus_timer", "seconds": 1500, "label": "Game night" }
  ]
}
```

The editor only ever offers commands already in the configured app catalog
(`apps.json` plus user-managed `custom_apps.json` games), and the server checks
that again on save and once more on every run. A scene can only rearrange
buttons and declared capabilities the deck already had. A scene holds up to 20
steps, a pause up to 2000ms, and app readiness waits up to 15 seconds.
Runs expose a run ID, step progress, cancellation, and a final outcome. Pinned
scenes get a one-tap chip on the home screen, and recent run outcomes are kept
in local activity history.

Scene runs are available through these API endpoints:

- `POST /api/scenes/<id>/start` — start an observable asynchronous run.
- `GET /api/scenes/runs/<run_id>` — read current step/status.
- `POST /api/scenes/runs/<run_id>/cancel` — request cancellation.
- `GET /api/scenes/runs` — read recent completed/failed/cancelled runs.

The existing `POST /api/scenes/<id>/run` endpoint remains available for
backward compatibility.

## Smart companion

Home includes a small Context Hub that prioritizes the current foreground app,
active Focus session, sustained system pressure, and deterministic workflow
suggestions. Suggestions explain both the action and the evidence behind it.
They never run automatically and offer `Accept / Run`, `Not now`, and
`Don't suggest this` feedback.

ArcDeck stores a bounded, local SQLite activity history in
`backend/data/activity.db`. It records stable app/Scene/action identifiers and
outcomes, not typed text, URLs, window titles, clipboard data, screenshots, or
screen contents. Home settings provide independent history and suggestion
toggles, retention selection, export, and clear-history controls.

The activity endpoints are:

- `GET /api/activity` — inspect recent allowlisted events.
- `GET /api/activity/summary` — read local aggregates used for ranking.
- `GET /api/activity/suggestions` — read deterministic recommendations.
- `GET/POST /api/activity/settings` — inspect or update privacy settings.
- `DELETE /api/activity` — clear local activity history.

## In focus

The home screen puts the actions of whatever window is in front on the PC near
the top, so the usual case takes no navigation. It only appears when the
foreground app is one of the apps in `apps.json` — matched on `process`, so an
app with no usable process name never shows up there. The Context Hub can also
show the current Focus session, a sustained-load warning, or one explained
workflow suggestion.

Focus Sessions persist across Home/Clock navigation and reloads. They support
pause, reset, completion state, restart, and a five-minute break action. Scenes
can start a Focus timer as a typed `focus_timer` step.

Off Windows there is no foreground window to read; set
`ARCDECK_FAKE_FOREGROUND=chrome.exe` to develop the card against a pretend one.

## Trackpad

One finger moves the pointer, a tap left-clicks, a two-finger tap right-clicks,
two fingers dragging scroll, and double-tap-and-hold holds the left button down
so the next move drags. Speed is a slider on the pad and is remembered.

Pointer movement goes over the Socket.IO connection that is already open rather
than a `POST` per touch, and moves are accumulated and sent once per animation
frame — a request each was what made the pointer trail the finger. `pyautogui`'s
default `PAUSE = 0.1` (a sleep after *every* call) is turned off for the same
reason. The HTTP endpoints under `/api/mouse` still work and are used if the
socket is down.

## App mixer

The media page lists the apps Windows currently has an audio session for and
gives each one its own slider and mute, which is how you turn the game down
without turning the call down. Off Windows the same dummy backend that fakes the
master volume fakes a few sessions.

## Clipboard bridge

The Control page includes an opt-in Clipboard Bridge for authenticated,
bidirectional text synchronization between the phone and the Windows PC. The
`Clipboard Sync` setting is stored locally on the phone and defaults to off.

When enabled:

- `Read PC` loads the current Windows text clipboard into ArcDeck.
- PC clipboard changes are sent to the connected phone over the authenticated
  Socket.IO connection.
- `Send to PC` writes the text field to the Windows clipboard and updates the
  shared in-memory state.
- `Copy to phone` uses the browser's Clipboard API to copy the text on the phone.

The initial connection establishes the current PC text as the shared baseline;
it does not overwrite either side. Updates use a server-side version and
content comparison to prevent feedback loops. Disconnecting does not modify
the PC clipboard. Clipboard contents are never written to activity history,
logs, analytics, or browser storage. The bridge supports text only, is limited
to 100,000 characters, and requires Windows for PC monitoring and writes.

## Custom games

The Apps page's Games filter includes an `Add game` action. It stores user-added
games and image overrides separately in `backend/data/custom_apps.json`, so
updating the shipped `backend/data/apps.json` does not overwrite them. A game
can have:

- an executable path;
- an optional process name;
- an optional image URL or local `/images/...` path;
- the normal launch/focus/close behavior.

Open a game from the Apps page and choose `Edit game` to change its path or
image. Custom game entries are local configuration and are ignored by Git.
