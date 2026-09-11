function video() {
    return document.querySelector("video.html5-main-video") || document.querySelector("video");
}

function text(selector) {
    return document.querySelector(selector)?.textContent?.trim() || "";
}

let mediaSessionArtwork = "";

function artwork() {
    const musicCover = document.querySelector("ytmusic-player-bar .thumbnail img") ||
        document.querySelector("ytmusic-player-bar img");
    return musicCover?.currentSrc || musicCover?.src || mediaSessionArtwork ||
        document.querySelector("meta[property='og:image']")?.content ||
        document.querySelector("meta[itemprop='thumbnailUrl']")?.content ||
        document.querySelector("link[itemprop='thumbnailUrl']")?.href ||
        document.querySelector("link[rel='image_src']")?.href ||
        video()?.poster || "";
}

window.addEventListener("message", event => {
    if (event.source !== window || event.data?.type !== "arcdeck-media-session-artwork")
        return;
    mediaSessionArtwork = typeof event.data.artwork === "string" ? event.data.artwork : "";
});

function state() {
    const player = video();
    if (!player)
        return null;

    const title = text("h1.ytd-watch-metadata") || text("ytmusic-player-bar .title") ||
        document.title.replace(/\s*-\s*YouTube(?: Music)?$/i, "").trim();
    const artist = text("ytd-channel-name a") || text("ytmusic-player-bar .subtitle a");
    const duration = Number(player.duration);
    const seekable = Number.isFinite(duration) && duration > 0 && player.seekable.length > 0;

    return {
        title: title || "YouTube",
        artist,
        album: "YouTube",
        playing: !player.paused && !player.ended,
        position: Number.isFinite(player.currentTime) ? player.currentTime : 0,
        duration: Number.isFinite(duration) ? duration : 0,
        can_seek: seekable,
        artwork: artwork()
    };
}

function next() {
    const button = document.querySelector(".ytp-next-button") ||
        document.querySelector("button[aria-label^='Next']") ||
        document.querySelector("ytmusic-player-bar #next-button");
    button?.click();
}

function previous(player) {
    const button = document.querySelector("button[aria-label^='Previous']") ||
        document.querySelector("ytmusic-player-bar #previous-button");
    if (button)
        button.click();
    else
        player.currentTime = 0;
}

function command(message) {
    if (!message || message.type !== "arcdeck-command")
        return;
    const player = video();
    if (!player)
        return;

    const { action, position } = message.command || {};
    if (action === "play") player.play();
    else if (action === "pause") player.pause();
    else if (action === "playpause") player.paused ? player.play() : player.pause();
    else if (action === "next" || action === "nexttrack") next();
    else if (action === "previous" || action === "prev" || action === "prevtrack") previous(player);
    else if (action === "seek" && Number.isFinite(Number(position))) player.currentTime = Number(position);
}

chrome.runtime.onMessage.addListener(command);

function report() {
    const current = state();
    if (!current)
        return;
    // Position updates are intentionally sent each second; that is also the
    // heartbeat through which the extension receives remote commands.
    chrome.runtime.sendMessage({ type: "arcdeck-media-state", state: current });
}

document.addEventListener("yt-navigate-finish", report);
window.setInterval(report, 1000);
report();
