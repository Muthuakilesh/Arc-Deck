import state from "./state.js";

const KEY = "arcdeck.wallpaper";

export const WALLPAPERS = [
    { id: "aurora", label: "Aurora" },
    { id: "mesh", label: "Mesh" },
    { id: "orbital", label: "Orbital" },
    { id: "glass", label: "Glass" },
    { id: "midnight", label: "Midnight" },
    { id: "developer", label: "Developer" },
    { id: "dynamic", label: "Dynamic" }
];

const defaults = { preset: "aurora", intensity: 70, blur: 0, brightness: 100, motion: true, image: "" };

function read() {
    try {
        const value = JSON.parse(localStorage.getItem(KEY) || "null");
        return value && typeof value === "object" ? { ...defaults, ...value } : { ...defaults };
    } catch (error) {
        return { ...defaults };
    }
}

function write(value) {
    try {
        localStorage.setItem(KEY, JSON.stringify(value));
    } catch (error) {
        // Wallpaper preferences are optional.
    }
}

export function currentWallpaper() {
    return read();
}

export function applyWallpaper(next = {}) {
    const settings = { ...read(), ...next };
    const known = WALLPAPERS.some(item => item.id === settings.preset);
    settings.preset = known ? settings.preset : defaults.preset;
    settings.intensity = Math.min(100, Math.max(0, Number(settings.intensity) || defaults.intensity));
    settings.blur = Math.min(20, Math.max(0, Number(settings.blur) || 0));
    settings.brightness = Math.min(130, Math.max(50, Number(settings.brightness) || defaults.brightness));
    state.wallpaper = settings;
    document.documentElement.dataset.wallpaper = settings.preset;
    document.documentElement.style.setProperty("--wallpaper-intensity", String(settings.intensity / 100));
    document.documentElement.style.setProperty("--wallpaper-blur", `${settings.blur}px`);
    document.documentElement.style.setProperty("--wallpaper-brightness", `${settings.brightness}%`);
    document.documentElement.classList.toggle("wallpaper-motion", settings.motion !== false);
    const layer = document.getElementById("wallpaper-layer");
    if (layer)
        layer.style.backgroundImage = settings.image ? `url("${settings.image.replace(/"/g, "\\\"")}")` : "";
    write(settings);
    return settings;
}

export function initWallpaper() {
    return applyWallpaper();
}
