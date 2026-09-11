import mountChrome from "../js/chrome.js";
import PageIntro from "../components/pageIntro.js";

import { fetchFrame, tapScreen } from "../js/screen.js";
import { toast } from "../js/toast.js";


// Frames are fetched one at a time and the next is only asked for once the last
// one has arrived, so a slow link degrades to fewer frames rather than a queue.
const RATES = [
    { label: "Slow", gap: 2000, width: 320, quality: 35 },
    { label: "Normal", gap: 900, width: 480, quality: 45 },
    { label: "Sharp", gap: 700, width: 720, quality: 60 }
];

const AUTO_KEY = "arcdeck.screenAuto";
const RATE_KEY = "arcdeck.screenRate";


export default function ScreenPage() {
    const page = document.createElement("div");
    page.className = "screenpeek page ios-modular-page";

    mountChrome();

    let rate = RATES[1];
    let autoMode = true;
    let running = true;
    let timer = 0;
    let markerTimer = 0;
    let url = "";
    let started = false;
    let latency = 0;
    let badStreak = 0;
    let goodStreak = 0;
    let errorStreak = 0;
    let lastFrameAt = 0;

    const header = PageIntro({ eyebrow: "LIVE DISPLAY", title: "Screen", icon: "screen", meta: "Remote viewport" });

    const picker = document.createElement("div");
    picker.className = "pad-profiles module module-screen-controls";

    const telemetry = document.createElement("p");
    telemetry.className = "screen-status";
    telemetry.textContent = "Mode: auto";

    const card = document.createElement("div");
    card.className = "glass card module module-screen screen-card";

    const shot = document.createElement("img");
    shot.className = "screen-shot";
    shot.alt = "Your PC screen. Tap to click there.";

    const marker = document.createElement("div");
    marker.className = "screen-tap-marker";
    marker.setAttribute("aria-hidden", "true");

    const status = document.createElement("p");
    status.className = "screen-status";
    status.textContent = "Connecting\u2026";

    const pause = document.createElement("button");
    pause.type = "button";
    pause.className = "chip";
    pause.textContent = "Pause";

    const reconnect = document.createElement("button");
    reconnect.type = "button";
    reconnect.className = "chip";
    reconnect.textContent = "Reconnect";

    card.appendChild(shot);
    card.appendChild(marker);
    card.appendChild(status);

    const modules = document.createElement("div");
    modules.className = "module-grid module-grid-screen";

    page.appendChild(header);
    modules.appendChild(picker);
    modules.appendChild(telemetry);
    modules.appendChild(card);
    page.appendChild(modules);

    function saveMode() {
        try {
            localStorage.setItem(AUTO_KEY, autoMode ? "1" : "0");
            localStorage.setItem(RATE_KEY, rate.label);
        } catch (error) {
            // Storage is optional for this preference.
        }
    }

    function loadMode() {
        try {
            const savedAuto = localStorage.getItem(AUTO_KEY);
            const savedRate = localStorage.getItem(RATE_KEY);

            autoMode = savedAuto !== "0";

            if (!autoMode && savedRate) {
                const found = RATES.find(entry => entry.label === savedRate);

                if (found)
                    rate = found;
            }
        } catch (error) {
            autoMode = true;
        }
    }

    function setRate(next) {
        rate = next;
        saveMode();
        updatePicker();
    }

    function setAuto(next) {
        autoMode = next;
        badStreak = 0;
        goodStreak = 0;
        errorStreak = 0;
        saveMode();
        updatePicker();
    }

    function rateIndex() {
        return RATES.indexOf(rate);
    }

    function updatePicker() {
        picker.querySelectorAll("[data-rate]").forEach(button => {
            button.classList.toggle("active", button.dataset.rate === rate.label && !autoMode);
        });

        const auto = picker.querySelector("[data-auto]");

        if (auto)
            auto.classList.toggle("active", autoMode);
    }

    function updateTelemetry(extra) {
        const mode = autoMode ? "Auto" : "Manual";
        const lag = latency ? Math.round(latency) + "ms" : "--";

        const age = lastFrameAt ? Math.max(0, Math.round((Date.now() - lastFrameAt) / 1000)) + "s old" : "No frame";
        telemetry.textContent = (running ? "LIVE" : "PAUSED") + " \u00b7 " + mode + " \u00b7 " + rate.label + " \u00b7 " + lag + " \u00b7 " + age + (extra ? " \u00b7 " + extra : "");
    }

    function tuneByLatency() {
        if (!autoMode)
            return;

        const index = rateIndex();

        if (latency > 1500) {
            badStreak += 1;
            goodStreak = 0;
        } else if (latency < 700) {
            goodStreak += 1;
            badStreak = 0;
        } else {
            badStreak = 0;
            goodStreak = 0;
        }

        if (badStreak >= 2 && index > 0) {
            setRate(RATES[index - 1]);
            badStreak = 0;
            goodStreak = 0;
            updateTelemetry("auto tuned down");
            return;
        }

        if (goodStreak >= 3 && index < RATES.length - 1) {
            setRate(RATES[index + 1]);
            badStreak = 0;
            goodStreak = 0;
            updateTelemetry("auto tuned up");
        }
    }

    function stop() {
        running = false;

        if (timer) {
            window.clearTimeout(timer);
            timer = 0;
        }

        if (markerTimer) {
            window.clearTimeout(markerTimer);
            markerTimer = 0;
        }
    }

    function showMarker(x, y) {
        marker.style.left = (x * 100) + "%";
        marker.style.top = (y * 100) + "%";
        marker.classList.add("show");

        if (markerTimer)
            window.clearTimeout(markerTimer);

        markerTimer = window.setTimeout(() => {
            marker.classList.remove("show");
        }, 360);
    }

    function schedule() {
        if (!running)
            return;

        timer = window.setTimeout(tick, rate.gap);
    }

    function tick() {
        // The view was replaced by another page; stop hitting the PC. The first
        // frame is asked for before the router has attached the page, so that
        // one is let through.
        if (started && !page.parentNode) {
            stop();
            return;
        }

        started = true;

        const startedAt = performance.now();

        fetchFrame(rate.width, rate.quality).then(blob => {
            const next = window.URL.createObjectURL(blob);

            if (url)
                window.URL.revokeObjectURL(url);

            url = next;
            shot.src = next;
            lastFrameAt = Date.now();
            const elapsed = performance.now() - startedAt;

            latency = latency ? (latency * 0.7 + elapsed * 0.3) : elapsed;
            errorStreak = 0;
            tuneByLatency();

            status.textContent = "Live \u00b7 " + rate.label + " \u00b7 tap the picture to click there";
            updateTelemetry();
            schedule();
        }).catch(error => {
            status.textContent = String(error.message || error);
            updateTelemetry("connection error");
            errorStreak += 1;

            if (autoMode && errorStreak >= 2 && rateIndex() > 0) {
                setRate(RATES[rateIndex() - 1]);
                errorStreak = 0;
                updateTelemetry("auto fallback");
            }

            schedule();
        });
    }

    shot.onclick = event => {
        const rect = shot.getBoundingClientRect();

        if (!rect.width || !rect.height)
            return;

        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;

        showMarker(x, y);
        status.textContent = "Tap sent: "
            + Math.round(x * 100)
            + "%, "
            + Math.round(y * 100)
            + "%";

        tapScreen(x, y).then(result => {
            if (result && result.error)
                toast(result.error);
        });
    };

    const auto = document.createElement("button");
    auto.type = "button";
    auto.className = "chip";
    auto.dataset.auto = "1";
    auto.textContent = "Auto";
    auto.onclick = () => {
        setAuto(true);
        updateTelemetry();
    };
    picker.appendChild(auto);

    RATES.forEach(entry => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "chip";
        button.dataset.rate = entry.label;
        button.textContent = entry.label;

        button.onclick = () => {
            setAuto(false);
            setRate(entry);
            updateTelemetry();
        };

        picker.appendChild(button);
    });

    pause.onclick = () => {
        if (running) {
            stop();
            pause.textContent = "Resume";
            status.textContent = "Paused";
            updateTelemetry("paused");
        } else {
            running = true;
            pause.textContent = "Pause";
            tick();
        }
    };

    picker.appendChild(pause);
    reconnect.onclick = () => {
        stop();
        running = true;
        started = false;
        badStreak = 0;
        goodStreak = 0;
        errorStreak = 0;
        latency = 0;
        pause.textContent = "Pause";
        status.textContent = "Reconnecting\u2026";
        updateTelemetry("reconnecting");
        tick();
    };
    picker.appendChild(reconnect);

    loadMode();
    updatePicker();
    updateTelemetry();

    tick();

    return page;
}
