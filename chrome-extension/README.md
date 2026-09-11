# ArcDeck YouTube Bridge

This local Chrome extension lets ArcDeck read and control a YouTube or YouTube Music tab without relying on Windows media-session support.

## Install

1. Start ArcDeck normally with `start-dev.ps1`.
2. Open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select this `chrome-extension` folder.
3. Click the new ArcDeck extension icon, enter the ArcDeck pairing PIN, and choose **Pair browser**.
4. Refresh the YouTube/YouTube Music tab, play a song, and open ArcDeck’s Media page.

The extension only has access to YouTube/YouTube Music and the local ArcDeck service at `localhost:5000`. It stores only the ArcDeck pairing token in Chrome's local extension storage.
