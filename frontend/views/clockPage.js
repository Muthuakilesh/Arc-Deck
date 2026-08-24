import mountChrome from "../js/chrome.js";

const PRESETS = [
    { label: "5m", seconds: 5 * 60 },
    { label: "10m", seconds: 10 * 60 },
    { label: "15m", seconds: 15 * 60 },
    { label: "25m", seconds: 25 * 60 },
    { label: "45m", seconds: 45 * 60 }
];
const PRESET_KEY = "arcdeck.clockPresetSeconds";

function loadPresetSeconds() {
    try {
        const value = Number(localStorage.getItem(PRESET_KEY));
        const known = PRESETS.some(item => item.seconds === value);

        return known ? value : 25 * 60;
    } catch (error) {
        return 25 * 60;
    }
}

function savePresetSeconds(seconds) {
    try {
        localStorage.setItem(PRESET_KEY, String(seconds));
    } catch (error) {
        // Storage failures are non-fatal; the timer keeps working.
    }
}

export default function ClockPage() {
    const page = document.createElement("div");
    page.className = "clock-page page";

    mountChrome();
    page.innerHTML = `
        <section class="clock-hero glass card"><p class="eyebrow">ARC FOCUS</p><time class="clock-time">--:--</time><p class="clock-date">Loading date…</p></section>
        <section class="focus-card glass card"><div><p class="eyebrow">FOCUS TIMER</p><h2 data-timer>25:00</h2></div><div class="focus-presets" data-presets></div><div class="focus-controls"><button type="button" data-start>Start</button><button type="button" data-reset>Reset</button><button type="button" data-focus>Focus mode</button></div><p data-status>Ready for a focused session.</p></section>`;

    const time = page.querySelector(".clock-time"), date = page.querySelector(".clock-date"), timer = page.querySelector("[data-timer]"), start = page.querySelector("[data-start]"), status = page.querySelector("[data-status]"), presetRow = page.querySelector("[data-presets]");
    let selectedPreset = loadPresetSeconds();
    let remaining = selectedPreset, timerId = null;

    const renderPresets = () => {
        presetRow.innerHTML = "";

        PRESETS.forEach(preset => {
            const button = document.createElement("button");

            button.type = "button";
            button.className = "focus-preset";
            button.textContent = preset.label;
            button.classList.toggle("active", preset.seconds === selectedPreset);
            button.onclick = () => {
                selectedPreset = preset.seconds;
                remaining = selectedPreset;
                clearInterval(timerId);
                timerId = null;
                start.textContent = "Start";
                status.textContent = "Preset selected.";
                savePresetSeconds(selectedPreset);
                drawTimer();
                renderPresets();
            };

            presetRow.appendChild(button);
        });
    };

    const drawTimer = () => { timer.textContent = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`; };
    const updateClock = () => { const now = new Date(); time.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); date.textContent = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" }); page.style.setProperty("--clock-hue", String((now.getSeconds() * 6 + now.getMinutes() * 2) % 360)); };
    start.onclick = () => {
        if (timerId) { clearInterval(timerId); timerId = null; start.textContent = "Resume"; status.textContent = "Timer paused."; return; }
        start.textContent = "Pause"; status.textContent = "Focus session active.";
        timerId = setInterval(() => { if (remaining <= 1) { clearInterval(timerId); timerId = null; remaining = 0; start.textContent = "Start"; status.textContent = "Session complete."; } else { remaining -= 1; drawTimer(); } }, 1000);
    };
    page.querySelector("[data-reset]").onclick = () => { clearInterval(timerId); timerId = null; remaining = selectedPreset; drawTimer(); start.textContent = "Start"; status.textContent = "Timer reset."; };
    page.querySelector("[data-focus]").onclick = event => { document.body.classList.toggle("arc-focus-mode"); event.currentTarget.textContent = document.body.classList.contains("arc-focus-mode") ? "Exit focus" : "Focus mode"; };
    updateClock(); drawTimer(); renderPresets();
    const clockId = setInterval(() => {
        if (!page.parentNode) {
            clearInterval(clockId);
            clearInterval(timerId);
            return;
        }

        updateClock();
    }, 1000);

    return page;
}
