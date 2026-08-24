import mountChrome from "../js/chrome.js";

const PRESETS = [
    { label: "5m", seconds: 5 * 60 },
    { label: "10m", seconds: 10 * 60 },
    { label: "15m", seconds: 15 * 60 },
    { label: "25m", seconds: 25 * 60 },
    { label: "45m", seconds: 45 * 60 }
];
const PRESET_KEY = "arcdeck.clockPresetSeconds";
const LANDSCAPE_KEY = "arcdeck.clockLandscape";
const NEON_KEY = "arcdeck.clockNeon";
const CLOCK_STYLE_KEY = "arcdeck.clockStyle";
const CLOCK_24H_KEY = "arcdeck.clock24h";
const CLOCK_SECONDS_KEY = "arcdeck.clockSeconds";
const CLOCK_DATE_KEY = "arcdeck.clockDate";
const STANDBY_KEY = "arcdeck.clockStandby";
const CLOCK_MOTION_KEY = "arcdeck.clockMotion";
const CLOCK_DIM_KEY = "arcdeck.clockDim";
const CLOCK_STYLES = [
    { id: "digital", label: "Digital" },
    { id: "flip", label: "Flip" },
    { id: "bedside", label: "Bedside" }
];
const CLOCK_MOTIONS = [
    { id: "calm", label: "Calm" },
    { id: "pulse", label: "Pulse" },
    { id: "static", label: "Static" }
];

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

function loadFlag(key, fallback) {
    try {
        const value = localStorage.getItem(key);

        if (value === null)
            return fallback;

        return value === "1";
    } catch (error) {
        return fallback;
    }
}

function saveFlag(key, value) {
    try {
        localStorage.setItem(key, value ? "1" : "0");
    } catch (error) {
        // Storage failure should not block interaction.
    }
}

function loadClockStyle() {
    try {
        const value = localStorage.getItem(CLOCK_STYLE_KEY);
        const known = CLOCK_STYLES.some(style => style.id === value);

        return known ? value : CLOCK_STYLES[0].id;
    } catch (error) {
        return CLOCK_STYLES[0].id;
    }
}

function saveClockStyle(styleId) {
    try {
        localStorage.setItem(CLOCK_STYLE_KEY, styleId);
    } catch (error) {
        // Storage failure should not block interaction.
    }
}

function loadClockMotion() {
    try {
        const value = localStorage.getItem(CLOCK_MOTION_KEY);
        const known = CLOCK_MOTIONS.some(motion => motion.id === value);

        return known ? value : CLOCK_MOTIONS[0].id;
    } catch (error) {
        return CLOCK_MOTIONS[0].id;
    }
}

function saveClockMotion(motionId) {
    try {
        localStorage.setItem(CLOCK_MOTION_KEY, motionId);
    } catch (error) {
        // Storage failure should not block interaction.
    }
}

function loadClockDim() {
    try {
        const value = Number(localStorage.getItem(CLOCK_DIM_KEY));

        if (!Number.isFinite(value))
            return 70;

        return Math.min(100, Math.max(25, Math.round(value)));
    } catch (error) {
        return 70;
    }
}

function saveClockDim(value) {
    try {
        localStorage.setItem(CLOCK_DIM_KEY, String(value));
    } catch (error) {
        // Storage failure should not block interaction.
    }
}

export default function ClockPage() {
    const page = document.createElement("div");
    page.className = "clock-page page";

    mountChrome();
    page.innerHTML = `
        <section class="clock-hero glass card" data-clock-hero><p class="eyebrow">ARC FOCUS</p><time class="clock-time">--:--</time><p class="clock-date">Loading date…</p><p class="clock-standby-tip">Tap anywhere to exit standby</p></section>
        <section class="focus-card glass card"><div><p class="eyebrow">FOCUS TIMER</p><h2 data-timer>25:00</h2></div><div class="focus-presets" data-presets></div><div class="focus-presets" data-clock-styles></div><div class="focus-presets" data-clock-options></div><div class="focus-presets" data-clock-motions></div><label class="clock-dim-row" data-clock-dim-row><span>Standby Dim</span><input type="range" min="25" max="100" step="1" data-clock-dim><output data-clock-dim-value>70%</output></label><div class="focus-controls"><button type="button" class="icon-only-button" data-start></button><button type="button" class="icon-only-button" data-reset></button><button type="button" class="icon-only-button" data-focus></button></div><div class="focus-controls"><button type="button" class="icon-only-button" data-landscape></button><button type="button" class="icon-only-button" data-neon></button><button type="button" class="icon-only-button" data-standby></button></div><p data-status>Ready for a focused session.</p></section>`;

    const time = page.querySelector(".clock-time"), date = page.querySelector(".clock-date"), timer = page.querySelector("[data-timer]"), start = page.querySelector("[data-start]"), status = page.querySelector("[data-status]"), presetRow = page.querySelector("[data-presets]"), clockStyleRow = page.querySelector("[data-clock-styles]"), clockOptionsRow = page.querySelector("[data-clock-options]"), clockMotionRow = page.querySelector("[data-clock-motions]"), clockDimRow = page.querySelector("[data-clock-dim-row]"), clockDimInput = page.querySelector("[data-clock-dim]"), clockDimValue = page.querySelector("[data-clock-dim-value]"), landscapeButton = page.querySelector("[data-landscape]"), neonButton = page.querySelector("[data-neon]"), standbyButton = page.querySelector("[data-standby]"), clockHero = page.querySelector("[data-clock-hero]");
    let selectedPreset = loadPresetSeconds();
    let remaining = selectedPreset, timerId = null;
    let landscape = loadFlag(LANDSCAPE_KEY, false);
    let neon = loadFlag(NEON_KEY, true);
    let clockStyle = loadClockStyle();
    let use24Hour = loadFlag(CLOCK_24H_KEY, false);
    let showSeconds = loadFlag(CLOCK_SECONDS_KEY, false);
    let showDate = loadFlag(CLOCK_DATE_KEY, true);
    let standby = loadFlag(STANDBY_KEY, false);
    let clockMotion = loadClockMotion();
    let standbyDim = loadClockDim();
    let previousClockText = "";

    const focusButton = page.querySelector("[data-focus]");
    const resetButton = page.querySelector("[data-reset]");

    const paintIconButton = (button, icon, label) => {
        button.textContent = icon;
        button.setAttribute("aria-label", label);
        button.title = label;
    };

    const paintStartState = () => {
        if (timerId)
            paintIconButton(start, "\u23F8", "Pause timer");
        else if (remaining <= 0)
            paintIconButton(start, "\u21BB", "Start timer");
        else
            paintIconButton(start, "\u25B6", "Start timer");
    };

    const applyDimLevel = () => {
        const brightness = String(standbyDim / 100);

        page.style.setProperty("--clock-dim", brightness);
        clockDimInput.value = String(standbyDim);
        clockDimValue.textContent = `${standbyDim}%`;
    };

    const applyModes = () => {
        document.body.classList.toggle("arc-landscape-clock", landscape);
        document.body.classList.toggle("arc-neon-clock", neon);
        document.body.classList.toggle("arc-clock-style-flip", clockStyle === "flip");
        document.body.classList.toggle("arc-clock-style-bedside", clockStyle === "bedside");
        document.body.classList.toggle("arc-standby-clock", standby);
        CLOCK_MOTIONS.forEach(motion => {
            document.body.classList.toggle(`arc-clock-motion-${motion.id}`, clockMotion === motion.id);
        });

        landscapeButton.classList.toggle("active", landscape);
        neonButton.classList.toggle("active", neon);
        standbyButton.classList.toggle("active", standby);

        paintIconButton(landscapeButton, landscape ? "\u2921" : "\u2922", landscape ? "Exit landscape" : "Landscape mode");
        paintIconButton(neonButton, neon ? "\u2726" : "\u2727", neon ? "Neon style on" : "Neon style off");
        paintIconButton(standbyButton, standby ? "\u2600" : "\u263D", standby ? "Exit standby" : "Standby mode");
        clockDimRow.style.display = standby ? "grid" : "none";
    };

    const drawClockStyles = () => {
        clockStyleRow.innerHTML = "";

        CLOCK_STYLES.forEach(style => {
            const button = document.createElement("button");

            button.type = "button";
            button.className = "focus-preset";
            button.textContent = style.label;
            button.classList.toggle("active", style.id === clockStyle);
            button.onclick = () => {
                clockStyle = style.id;
                saveClockStyle(clockStyle);
                previousClockText = "";
                applyModes();
                drawClockStyles();
                status.textContent = "Clock style: " + style.label;
            };

            clockStyleRow.appendChild(button);
        });
    };

    const drawClockOptions = () => {
        clockOptionsRow.innerHTML = "";

        const options = [
            {
                label: use24Hour ? "24H" : "12H",
                active: use24Hour,
                onClick() {
                    use24Hour = !use24Hour;
                    saveFlag(CLOCK_24H_KEY, use24Hour);
                    previousClockText = "";
                    updateClock();
                    drawClockOptions();
                    status.textContent = use24Hour ? "24-hour clock enabled." : "12-hour clock enabled.";
                }
            },
            {
                label: showSeconds ? "Seconds On" : "Seconds Off",
                active: showSeconds,
                onClick() {
                    showSeconds = !showSeconds;
                    saveFlag(CLOCK_SECONDS_KEY, showSeconds);
                    previousClockText = "";
                    updateClock();
                    drawClockOptions();
                    status.textContent = showSeconds ? "Seconds enabled." : "Seconds hidden.";
                }
            },
            {
                label: showDate ? "Date On" : "Date Off",
                active: showDate,
                onClick() {
                    showDate = !showDate;
                    saveFlag(CLOCK_DATE_KEY, showDate);
                    updateClock();
                    drawClockOptions();
                    status.textContent = showDate ? "Date enabled." : "Date hidden.";
                }
            }
        ];

        options.forEach(option => {
            const button = document.createElement("button");

            button.type = "button";
            button.className = "focus-preset";
            button.textContent = option.label;
            button.classList.toggle("active", option.active);
            button.onclick = option.onClick;
            clockOptionsRow.appendChild(button);
        });
    };

    const drawClockMotions = () => {
        clockMotionRow.innerHTML = "";

        CLOCK_MOTIONS.forEach(motion => {
            const button = document.createElement("button");

            button.type = "button";
            button.className = "focus-preset";
            button.textContent = motion.label;
            button.classList.toggle("active", motion.id === clockMotion);
            button.onclick = () => {
                clockMotion = motion.id;
                saveClockMotion(clockMotion);
                applyModes();
                drawClockMotions();
                status.textContent = "Clock motion: " + motion.label;
            };

            clockMotionRow.appendChild(button);
        });
    };

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
                paintStartState();
                status.textContent = "Preset selected.";
                savePresetSeconds(selectedPreset);
                drawTimer();
                renderPresets();
            };

            presetRow.appendChild(button);
        });
    };

    const drawTimer = () => { timer.textContent = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`; };
    const drawClockValue = text => {
        if (clockStyle !== "flip") {
            time.textContent = text;
            previousClockText = text;
            return;
        }

        time.innerHTML = "";

        for (let i = 0; i < text.length; i += 1) {
            const value = text.charAt(i);
            const span = document.createElement("span");

            span.textContent = value;
            span.className = value === ":" ? "clock-separator" : "clock-digit";

            if (previousClockText && value !== previousClockText.charAt(i) && value !== ":")
                span.classList.add("flip");

            time.appendChild(span);
        }

        previousClockText = text;
    };

    const updateClock = () => {
        const now = new Date();
        const clockText = now.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: showSeconds ? "2-digit" : undefined,
            hour12: !use24Hour
        });

        drawClockValue(clockText);
        date.textContent = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
        date.style.display = showDate ? "" : "none";
        page.style.setProperty("--clock-hue", String((now.getSeconds() * 6 + now.getMinutes() * 2) % 360));
    };
    start.onclick = () => {
        if (timerId) {
            clearInterval(timerId);
            timerId = null;
            paintStartState();
            status.textContent = "Timer paused.";
            return;
        }

        paintStartState();
        status.textContent = "Focus session active.";
        timerId = setInterval(() => {
            if (remaining <= 1) {
                clearInterval(timerId);
                timerId = null;
                remaining = 0;
                paintStartState();
                status.textContent = "Session complete.";
            } else {
                remaining -= 1;
                drawTimer();
            }
        }, 1000);
        paintStartState();
    };

    resetButton.onclick = () => {
        clearInterval(timerId);
        timerId = null;
        remaining = selectedPreset;
        drawTimer();
        paintStartState();
        status.textContent = "Timer reset.";
    };

    focusButton.onclick = () => {
        document.body.classList.toggle("arc-focus-mode");
        const active = document.body.classList.contains("arc-focus-mode");

        paintIconButton(focusButton, active ? "\u25CE" : "\u25D0", active ? "Exit focus mode" : "Focus mode");
    };
    landscapeButton.onclick = () => {
        landscape = !landscape;
        saveFlag(LANDSCAPE_KEY, landscape);
        applyModes();
        status.textContent = landscape ? "Landscape mode enabled." : "Landscape mode disabled.";
    };

    neonButton.onclick = () => {
        neon = !neon;
        saveFlag(NEON_KEY, neon);
        applyModes();
        status.textContent = neon ? "Neon style enabled." : "Neon style disabled.";
    };

    standbyButton.onclick = () => {
        standby = !standby;
        saveFlag(STANDBY_KEY, standby);
        applyModes();
        status.textContent = standby ? "Standby mode enabled." : "Standby mode disabled.";
    };

    clockHero.onclick = () => {
        if (!standby)
            return;

        standby = false;
        saveFlag(STANDBY_KEY, standby);
        applyModes();
        status.textContent = "Standby mode disabled.";
    };

    clockDimInput.oninput = () => {
        standbyDim = Number(clockDimInput.value);
        applyDimLevel();
        saveClockDim(standbyDim);
    };

    paintIconButton(resetButton, "\u21BA", "Reset timer");
    paintIconButton(focusButton, "\u25D0", "Focus mode");

    updateClock(); drawTimer(); renderPresets(); drawClockStyles(); drawClockOptions(); drawClockMotions(); applyDimLevel(); applyModes(); paintStartState();
    const clockId = setInterval(() => {
        if (!page.parentNode) {
            clearInterval(clockId);
            clearInterval(timerId);
            document.body.classList.remove("arc-landscape-clock");
            document.body.classList.remove("arc-neon-clock");
            document.body.classList.remove("arc-clock-style-flip");
            document.body.classList.remove("arc-clock-style-bedside");
            document.body.classList.remove("arc-standby-clock");
            CLOCK_MOTIONS.forEach(motion => {
                document.body.classList.remove(`arc-clock-motion-${motion.id}`);
            });
            return;
        }

        updateClock();
    }, 1000);

    return page;
}
