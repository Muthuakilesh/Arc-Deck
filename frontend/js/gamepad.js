import { post } from "./api.js";
import { sendPad } from "./websocket.js";


const PROFILE_KEY = "arcdeck.pad.profile";

// A stick and six buttons is what fits on a 5s and covers most PC games. The
// keys are whatever the game is bound to, so the profile is the mapping.
export const PROFILES = [
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
