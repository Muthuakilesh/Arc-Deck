import { loadMedia, mediaAction } from "../js/media.js";
import { off, on } from "../js/events.js";
import { iconMarkup } from "./icon.js";

function formatTime(value) {
    const seconds = Math.max(0, Math.floor(Number(value) || 0));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function MediaDrawer() {
    const drawer = document.createElement("div");
    drawer.className = "glass card module module-media media-drawer";
    drawer.innerHTML = "<div class='media-heading'><div><p class='eyebrow'>NOW PLAYING</p><h2>Media</h2></div><span class='media-source' data-media-source>CHROME / MEDIA SESSION</span></div>" +
        "<div class='media-track-art'><img data-art alt='' hidden><span data-art-icon aria-hidden='true'>" + iconMarkup("media", { size: 30 }) + "</span></div>" +
        "<div class='media-track-copy'><strong data-track>Waiting for media</strong><span data-artist>Play music in Chrome to see it here.</span></div>" +
        "<p class='media-state' data-media-state>Checking playback</p>" +
        "<div class='media-timeline'><span data-current>0:00</span><input type='range' min='0' max='0' value='0' step='1' aria-label='Playback position' data-seek disabled><span data-duration>0:00</span></div>" +
        "<div class='controls'><button type='button' data-prev class='control-button' aria-label='Previous track'>" + iconMarkup("prev", { size: 18 }) + "</button>" +
        "<button type='button' data-play class='control-button play-button' aria-label='Play or pause'>" + iconMarkup("play", { size: 18 }) + "</button>" +
        "<button type='button' data-next class='control-button' aria-label='Next track'>" + iconMarkup("next", { size: 18 }) + "</button>" +
        "<button type='button' data-mute class='control-button mute-button' aria-label='Mute or unmute'>" + iconMarkup("volume-mute", { size: 18 }) + "</button></div>";

    const track = drawer.querySelector("[data-track]");
    const artist = drawer.querySelector("[data-artist]");
    const mediaState = drawer.querySelector("[data-media-state]");
    const source = drawer.querySelector("[data-media-source]");
    const seek = drawer.querySelector("[data-seek]");
    const current = drawer.querySelector("[data-current]");
    const duration = drawer.querySelector("[data-duration]");
    const play = drawer.querySelector("[data-play]");
    const art = drawer.querySelector("[data-art]");
    const artIcon = drawer.querySelector("[data-art-icon]");
    let pollTimer = 0;
    let lastData = null;
    let heldSeek = null;

    const paintSeek = (position, total) => {
        const progress = total > 0 ? Math.max(0, Math.min(100, position / total * 100)) : 0;
        seek.style.setProperty("--seek-progress", `${progress}%`);
    };

    art.onerror = () => {
        art.hidden = true;
        artIcon.hidden = false;
    };

    const paintMedia = data => {
        if (!data || data.error)
            return;

        lastData = data;
        const active = data.title && data.title !== "No active media" && data.title !== "No media detected";
        track.textContent = active ? data.title : "No active media";
        artist.textContent = active ? (data.artist || data.album || "Chrome media session") : "Play music in Chrome to see it here.";
        mediaState.textContent = active ? (data.playing ? "Playing" : "Paused") : "Waiting for media";
        source.textContent = active && data.source === "windows-media-session" ? "WINDOWS MEDIA SESSION" : "CHROME / MEDIA SESSION";
        const total = Math.max(0, Number(data.duration) || 0);
        const reported = Math.min(total || Number(data.position) || 0, Math.max(0, Number(data.position) || 0));
        let position = reported;
        if (heldSeek && Date.now() < heldSeek.until && Math.abs(reported - heldSeek.position) > 2)
            position = heldSeek.position;
        else
            heldSeek = null;
        seek.max = String(Math.round(total));
        seek.value = String(Math.round(position));
        paintSeek(position, total);
        seek.disabled = !data.can_seek || total <= 0;
        current.textContent = formatTime(position);
        duration.textContent = formatTime(total);
        play.innerHTML = iconMarkup(data.playing ? "pause" : "play", { size: 18 });
        play.setAttribute("aria-label", data.playing ? "Pause" : "Play");
        const artwork = active && typeof data.artwork === "string" ? data.artwork : "";
        art.hidden = !artwork;
        artIcon.hidden = Boolean(artwork);
        if (artwork && art.src !== artwork)
            art.src = artwork;
    };

    const runAction = action => mediaAction(action).then(loadMedia).then(paintMedia);
    play.onclick = () => runAction("playpause");
    drawer.querySelector("[data-next]").onclick = () => runAction("next");
    drawer.querySelector("[data-prev]").onclick = () => runAction("previous");
    drawer.querySelector("[data-mute]").onclick = () => runAction("mute");
    seek.oninput = () => {
        current.textContent = formatTime(seek.value);
        paintSeek(Number(seek.value), Number(seek.max));
    };
    seek.onchange = () => {
        const position = Number(seek.value);
        heldSeek = { position, until: Date.now() + 3000 };
        mediaAction("seek", position).then(() => window.setTimeout(() => loadMedia().then(paintMedia), 700));
    };

    const poll = () => {
        if (!drawer.parentNode) {
            off("media:update", paintMedia);
            return;
        }
        loadMedia().then(paintMedia);
        pollTimer = window.setTimeout(poll, lastData && lastData.playing ? 1000 : 4000);
    };

    on("media:update", paintMedia);
    poll();
    return drawer;
}
