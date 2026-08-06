import { get, post } from "./api.js";

import state from "./state.js";

import { emit } from "./events.js";


export async function loadApps() {
    const apps = await get("/apps");

    state.apps = Array.isArray(apps) ? apps : [];

    return state.apps;
}


// The socket only carries the names that are up, so the cached list is patched
// rather than refetched on every tick.
export function applyRunning(names) {
    const running = {};

    (names || []).forEach(name => {
        running[String(name).toLowerCase()] = true;
    });

    state.apps.forEach(app => {
        app.running = running[String(app.name).toLowerCase()] === true;
    });

    emit("apps:running", state.apps);
}


export function launchApp(name) {
    return post("/apps/open", { name: name });
}


export function runAppAction(name, action) {
    return post("/apps/action", { name: name, action: action });
}
