// Runs in the page's world so it can read the Media Session that YouTube owns.
// It deliberately sends only public artwork URLs, never extension credentials.
function reportArtwork() {
    const artwork = navigator.mediaSession?.metadata?.artwork || [];
    const source = artwork.length ? artwork[artwork.length - 1].src : "";
    window.postMessage({ type: "arcdeck-media-session-artwork", artwork: source || "" }, location.origin);
}

window.setInterval(reportArtwork, 1000);
reportArtwork();
