import { get, post } from "./api.js";

import state from "./state.js";

import { emit } from "./events.js";

const FAVORITES_KEY = "arcdeck.favorites";
const RECENTS_KEY = "arcdeck.recents";
const MAX_FAVORITES = 6;
const MAX_RECENTS = 8;

function normalizeName(name) {
    return String(name || "").trim();
}

function loadList(key) {
    try {
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : [];

        if (!Array.isArray(parsed))
            return [];

        return parsed.map(normalizeName).filter(Boolean);
    } catch (error) {
        return [];
    }
}

function saveList(key, values) {
    try {
        localStorage.setItem(key, JSON.stringify(values));
    } catch (error) {
        // Private mode or storage limits can block writes; keep in-memory state.
    }
}

function emitQuickAccess() {
    emit("apps:favorites", state.favorites.slice());
    emit("apps:recents", state.recents.slice());
}

function initQuickAccessState() {
    if (!Array.isArray(state.favorites) || !state.favorites.length)
        state.favorites = loadList(FAVORITES_KEY);

    if (!Array.isArray(state.recents) || !state.recents.length)
        state.recents = loadList(RECENTS_KEY);
}


export async function loadApps() {
    initQuickAccessState();

    const apps = await get("/apps");

    state.apps = Array.isArray(apps) ? apps : [];

    const status = await get("/apps/running");

    if (status && !status.error)
        applyRunning(status.running, status.foreground);

    emitQuickAccess();

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
    const app = normalizeName(name);

    if (app)
        recordRecentApp(app);

    return post("/apps/open", { name: name });
}


export function runAppAction(name, action) {
    const app = normalizeName(name);

    if (app)
        recordRecentApp(app);

    return post("/apps/action", { name: name, action: action });
}

export function getFavoriteNames() {
    initQuickAccessState();
    return state.favorites.slice();
}

export function getRecentNames() {
    initQuickAccessState();
    return state.recents.slice();
}

export function isFavorite(name) {
    const wanted = normalizeName(name).toLowerCase();

    if (!wanted)
        return false;

    return getFavoriteNames().some(item => item.toLowerCase() === wanted);
}

export function toggleFavorite(name) {
    initQuickAccessState();

    const app = normalizeName(name);

    if (!app)
        return false;

    const wanted = app.toLowerCase();
    const next = state.favorites.filter(item => item.toLowerCase() !== wanted);
    const enabled = next.length === state.favorites.length;

    if (enabled)
        next.unshift(app);

    state.favorites = next.slice(0, MAX_FAVORITES);
    saveList(FAVORITES_KEY, state.favorites);
    emit("apps:favorites", state.favorites.slice());

    return enabled;
}

export function recordRecentApp(name) {
    initQuickAccessState();

    const app = normalizeName(name);

    if (!app)
        return;

    const wanted = app.toLowerCase();
    const next = state.recents.filter(item => item.toLowerCase() !== wanted);

    next.unshift(app);

    state.recents = next.slice(0, MAX_RECENTS);
    saveList(RECENTS_KEY, state.recents);
    emit("apps:recents", state.recents.slice());
}
