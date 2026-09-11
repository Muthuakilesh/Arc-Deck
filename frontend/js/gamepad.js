import { post } from "./api.js";
import { sendPad } from "./websocket.js";


const PROFILE_KEY = "arcdeck.pad.profile";
const CUSTOM_KEY = "arcdeck.pad.customProfiles";
const ALLOWED_KEYS = /^[a-z0-9]$|^(up|down|left|right|space|enter|tab|esc|backspace|shift|shiftright|ctrl|ctrlright|alt|altright|f([1-9]|1[0-2]))$/;

// A stick and six buttons is what fits on a 5s and covers most PC games. The
// keys are whatever the game is bound to, so the profile is the mapping.
const DEFAULT_PROFILES = [
    {
        id: "wasd",
        label: "WASD",
        stick: { up: "w", down: "s", left: "a", right: "d" },
        buttons: [
            { key: "space", label: "Jump" },
            { key: "shift", label: "Sprint" },
            { key: "ctrl", label: "Crouch" },
            { key: "e", label: "Use" },
            { key: "r", label: "Reload" },
            { key: "esc", label: "Menu" }
        ]
    },
    {
        id: "arrows",
        label: "Arrows",
        stick: { up: "up", down: "down", left: "left", right: "right" },
        buttons: [
            { key: "z", label: "Z" },
            { key: "x", label: "X" },
            { key: "c", label: "C" },
            { key: "enter", label: "Start" },
            { key: "shift", label: "Shift" },
            { key: "esc", label: "Esc" }
        ]
    },
    {
        id: "media",
        label: "Deck",
        stick: { up: "up", down: "down", left: "left", right: "right" },
        buttons: [
            { key: "space", label: "Play" },
            { key: "f", label: "Full" },
            { key: "m", label: "Mute" },
            { key: "enter", label: "Enter" },
            { key: "tab", label: "Tab" },
            { key: "esc", label: "Esc" }
        ]
    }
];


function loadCustomProfiles() {
    try {
        const values = JSON.parse(window.localStorage.getItem(CUSTOM_KEY) || "[]");
        return Array.isArray(values) ? values.filter(profile => profile && profile.id && profile.stick && Array.isArray(profile.buttons)) : [];
    } catch (error) {
        return [];
    }
}


export let PROFILES = DEFAULT_PROFILES.concat(loadCustomProfiles());


export function saveCustomProfile(profile) {
    const buttons = (profile.buttons || []).slice(0, 6).map(button => ({
        key: String(button.key || "").trim().toLowerCase(),
        label: String(button.label || button.key || "Key").trim().slice(0, 12)
    }));
    const stick = {};
    ["up", "down", "left", "right"].forEach(direction => {
        stick[direction] = String(profile.stick && profile.stick[direction] || "").trim().toLowerCase();
    });
    const allKeys = buttons.map(button => button.key).concat(Object.values(stick));
    if (buttons.length !== 6 || allKeys.some(key => !ALLOWED_KEYS.test(key)))
        return { error: "Use six allowed keyboard keys and four valid stick directions." };

    const saved = {
        id: String(profile.id || "custom-" + Date.now().toString(36)),
        label: String(profile.label || "Custom").trim().slice(0, 18),
        stick: stick,
        buttons: buttons,
        deadzone: Math.max(6, Math.min(40, Number(profile.deadzone) || 14)),
        app: String(profile.app || "").trim()
    };
    const custom = loadCustomProfiles().filter(item => item.id !== saved.id);
    custom.push(saved);
    try {
        window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(custom));
    } catch (error) {
        return { error: "Could not save the profile." };
    }
    PROFILES = DEFAULT_PROFILES.concat(custom);
    return saved;
}


export function profileForApp(appName) {
    const wanted = String(appName || "").toLowerCase();
    return PROFILES.find(profile => profile.app && profile.app.toLowerCase() === wanted) || null;
}


export function profileById(id) {
    const found = PROFILES.filter(profile => profile.id === id);

    return found.length ? found[0] : PROFILES[0];
}


export function currentProfile() {
    try {
        return profileById(window.localStorage.getItem(PROFILE_KEY));
    } catch (error) {
        return PROFILES[0];
    }
}


export function rememberProfile(id) {
    try {
        window.localStorage.setItem(PROFILE_KEY, id);
    } catch (error) {
        // Private browsing blocks storage; the choice lasts until reload.
    }
}


export function holdKey(key, down) {
    const payload = { key: key, down: down };

    if (sendPad(payload))
        return Promise.resolve(null);

    return post("/gamepad/key", payload);
}


// Called when the pad is left or the page is hidden: anything still held would
// otherwise stay held on the PC.
export function releaseAll() {
    return post("/gamepad/release", {});
}
