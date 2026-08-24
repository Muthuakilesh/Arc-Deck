import state from "../js/state.js";
import { on } from "../js/events.js";
import { adjustVolume, changeVolume, setDragging, syncVolume, toggleMute } from "../js/volume.js";
import { focusedApp } from "../js/apps.js";
import { loadSessions, setSessionMute } from "../js/mixer.js";

function clean(value) {
    return String(value || "").toLowerCase().trim();
}

function byFocusedApp(sessions) {
    const app = focusedApp();

    if (!app)
        return null;

    const process = clean(app.process);
    const name = clean(app.name);

    return (sessions || []).find(session => {
        const sessionProcess = clean(session.process);
        const sessionName = clean(session.process).replace(/\.exe$/i, "");

        if (process && sessionProcess)
            return process === sessionProcess;

        return name && name === sessionName;
    }) || null;
}

export default function VolumeControl() {
    const container = document.createElement("section");
    container.className = "glass card module module-volume volume";
    container.innerHTML = `
        <div class="volume-heading">
            <div><p class="eyebrow">PC AUDIO</p><h3>Volume</h3></div>
            <button class="mute-button" type="button" data-mute aria-label="Mute volume">&#128266;</button>
        </div>
        <div class="volume-readout"><strong data-value>--%</strong><span data-status>Checking PC…</span></div>
        <input class="volume-slider" data-slider type="range" min="0" max="100" step="1" value="50" aria-label="PC volume">
        <div class="volume-buttons">
            <button class="control-button" type="button" data-adjust="-10">&#8722; 10</button>
            <button class="control-button primary-control" type="button" data-adjust="10">+ 10</button>
            <button class="control-button" type="button" data-focus-mute>Mute focused app</button>
        </div>`;

    const value = container.querySelector("[data-value]");
    const status = container.querySelector("[data-status]");
    const slider = container.querySelector("[data-slider]");
    const mute = container.querySelector("[data-mute]");
    const focusMute = container.querySelector("[data-focus-mute]");

    function paintFocusMuteButton() {
        const app = focusedApp();

        if (!app) {
            focusMute.disabled = true;
            focusMute.textContent = "Mute focused app";
            focusMute.setAttribute("aria-label", "Mute focused app");
            return;
        }

        focusMute.disabled = false;
        focusMute.textContent = "Mute " + app.name;
        focusMute.setAttribute("aria-label", "Mute " + app.name);
    }

    function paintTrack(percent) {
        // backgroundImage, not the `background` shorthand: the shorthand would
        // reset the background-size that squeezes this into the 10px track.
        slider.style.backgroundImage =
            `linear-gradient(90deg, var(--accent) ${percent}%, rgba(255,255,255,.13) ${percent}%)`;
    }

    function render(data) {
        if (!container.isConnected || !data || typeof data.volume !== "number")
            return;

        value.textContent = `${data.volume}%`;

        // The input is the source of truth while a finger is on it.
        if (document.activeElement !== slider)
            slider.value = data.volume;

        paintTrack(data.volume);

        const muted = Boolean(data.muted);
        mute.innerHTML = muted ? "&#128263;" : "&#128266;";
        mute.setAttribute("aria-label", muted ? "Unmute volume" : "Mute volume");
        mute.classList.toggle("is-muted", muted);
        status.textContent = muted ? "Muted" : "Connected to PC";
    }

    // 'input' fires continuously on drag; 'change' alone only fires on release.
    slider.addEventListener("input", () => {
        const percent = Number(slider.value);
        value.textContent = `${percent}%`;
        paintTrack(percent);
        changeVolume(percent);
    });

    ["touchstart", "mousedown"].forEach(name => {
        slider.addEventListener(name, () => setDragging(true));
    });

    ["touchend", "touchcancel", "mouseup", "change"].forEach(name => {
        slider.addEventListener(name, () => setDragging(false));
    });

    container.querySelectorAll("[data-adjust]").forEach(button => {
        button.addEventListener("click", () => {
            status.textContent = "Updating…";
            adjustVolume(Number(button.dataset.adjust));
        });
    });

    mute.addEventListener("click", () => {
        status.textContent = "Updating…";
        toggleMute();
    });

    focusMute.addEventListener("click", async () => {
        const app = focusedApp();

        if (!app) {
            status.textContent = "No supported app is focused.";
            paintFocusMuteButton();
            return;
        }

        status.textContent = "Checking focused app…";

        const sessions = await loadSessions();
        const session = byFocusedApp(sessions);

        if (!session) {
            status.textContent = app.name + " has no active audio session.";
            paintFocusMuteButton();
            return;
        }

        status.textContent = "Updating app audio…";

        const result = await setSessionMute(session.pid, !session.muted);

        if (result && !result.error) {
            status.textContent = result.muted
                ? "Focused app muted"
                : "Focused app unmuted";
            paintFocusMuteButton();
            return;
        }

        status.textContent = result && result.error
            ? result.error
            : "Failed to update focused app.";
        paintFocusMuteButton();
    });

    on("volume:update", render);
    on("volume:error", message => {
        if (container.isConnected)
            status.textContent = message;
    });

    // Without this the card keeps the value (and "PIN required") from before the re-pair.
    on("auth:paired", () => {
        if (container.isConnected)
            syncVolume();
    });

    on("apps:foreground", () => {
        if (container.isConnected)
            paintFocusMuteButton();
    });

    render(state.volume);
    paintFocusMuteButton();
    syncVolume();

    return container;
}
