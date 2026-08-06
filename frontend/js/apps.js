import { get, post } from "./api.js";

import state from "./state.js";

import { emit } from "./events.js";


export async function loadApps() {
    const apps = await get("/apps");

    state.apps = Array.isArray(apps) ? apps : [];

    const status = await get("/apps/running");

    if (status && !status.error)
        applyRunning(status.running, status.foreground);

    return state.apps;
}


export function appByName(name) {
    const wanted = String(name || "").toLowerCase();
    const found = state.apps.filter(app => String(app.name).toLowerCase() === wanted);

    return found.length ? found[0] : null;
}


// The window the user is looking at, as one of their configured apps. Null when
// the PC cannot report it (no pywin32) or the app is not in apps.json.
export function focusedApp() {
    return state.foreground ? appByName(state.foreground.app) : null;
}


function applyForeground(window) {
    const before = state.foreground ? state.foreground.app : null;

    state.foreground = window && window.app ? window : null;

    const after = state.foreground ? state.foreground.app : null;

    if (before !== after)
        emit("apps:foreground", focusedApp());
}


// The socket only carries the names that are up, so the cached list is patched
// rather than refetched on every tick.
export function applyRunning(names, foreground) {
    const running = {};

    (names || []).forEach(name => {
        running[String(name).toLowerCase()] = true;
    });

    state.apps.forEach(app => {
        app.running = running[String(app.name).toLowerCase()] === true;
    });

    emit("apps:running", state.apps);
    applyForeground(foreground);
}


export function launchApp(name) {
    return post("/apps/open", { name: name });
}


export function runAppAction(name, action) {
    return post("/apps/action", { name: name, action: action });
}
