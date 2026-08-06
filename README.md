# Arc-Deck

A phone-sized control deck for a Windows PC. Run the server on the PC, open it
from the phone on the same network, pair once with the PIN the server prints.

```bash
cd backend
pip install -r requirements.txt
python app.py            # prints the pairing PIN, serves the UI on :5000
```

Set `ARCDECK_PIN` to choose the PIN yourself.

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
