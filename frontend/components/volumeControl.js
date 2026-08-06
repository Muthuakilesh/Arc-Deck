import { get, post } from "../js/api.js";

export default function VolumeControl() {
    const container = document.createElement("section");
    container.className = "glass card volume";
    container.innerHTML = `
        <div class="volume-heading">
            <div><p class="eyebrow">PC AUDIO</p><h3>Volume</h3></div>
            <button class="mute-button" type="button" data-mute aria-label="Mute volume">&#128266;</button>
        </div>
        <div class="volume-readout"><strong data-value>--%</strong><span data-status>Checking PC…</span></div>
        <input class="volume-slider" data-slider type="range" min="0" max="100" value="50" aria-label="PC volume">
        <div class="volume-buttons">
            <button class="control-button" type="button" data-adjust="-10">&#8722; 10</button>
            <button class="control-button primary-control" type="button" data-adjust="10">+ 10</button>
        </div>`;

    const value = container.querySelector("[data-value]");
    const status = container.querySelector("[data-status]");
    const slider = container.querySelector("[data-slider]");
    const mute = container.querySelector("[data-mute]");
    let currentVolume = 50;

    function render(data) {
        if (!data || typeof data.volume !== "number") return false;
        currentVolume = data.volume;
        value.textContent = `${data.volume}%`;
        slider.value = data.volume;
        slider.style.background = `linear-gradient(90deg, var(--accent) ${data.volume}%, rgba(255,255,255,.13) ${data.volume}%)`;
        const muted = Boolean(data.muted);
        mute.innerHTML = muted ? "&#128263;" : "&#128266;";
        mute.setAttribute("aria-label", muted ? "Unmute volume" : "Mute volume");
        status.textContent = muted ? "Muted" : "Connected to PC";
        return true;
    }

    async function send(body) {
        status.textContent = "Updating…";
        const data = await post("/action", body);
        if (!render(data)) status.textContent = "PC connection failed";
    }

    container.querySelectorAll("[data-adjust]").forEach(button => {
        button.addEventListener("click", () => send({
            command: "volume",
            value: Math.max(0, Math.min(100, currentVolume + Number(button.dataset.adjust)))
        }));
    });
    mute.addEventListener("click", () => send({ command: "mute" }));
    slider.addEventListener("change", () => send({ command: "volume", value: Number(slider.value) }));

    post("/action", { command: "volume_state" }).then(data => {
        if (!render(data)) status.textContent = "PC connection failed";
    });
    return container;
}
