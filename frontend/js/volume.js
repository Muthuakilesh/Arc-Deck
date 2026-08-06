import { get, post } from "./api.js";

import state from "./state.js";

import { emit } from "./events.js";


// Dragging a slider fires far faster than Windows can answer; only one write is in
// flight at a time and the newest value wins.
const SEND_INTERVAL = 70;

let inFlight = false;
let queued = null;
let lastSent = 0;
let dragging = false;


function store(data) {
    if (data && data.error) {
        emit("volume:error", data.error);
        return null;
    }

    if (!data || typeof data.volume !== "number")
        return null;

    state.volume = { volume: data.volume, muted: Boolean(data.muted) };
    emit("volume:update", state.volume);
    return state.volume;
}


export function isDragging() {
    return dragging;
}

export function setDragging(value) {
    dragging = Boolean(value);
}


export async function syncVolume() {
    // Never let a poll overwrite the value the user is currently dragging.
    if (dragging)
        return state.volume;

    return store(await get("/audio"));
}


async function flush() {
    if (inFlight || queued === null)
        return;

    const value = queued;
    queued = null;
    inFlight = true;
    lastSent = Date.now();

    const data = await post("/audio/volume", { value: value });

    inFlight = false;
    store(data);

    if (queued !== null)
        flush();

    return data;
}


export function changeVolume(value) {
    queued = Math.max(0, Math.min(100, Math.round(value)));

    // Optimistic: the UI follows the finger even before the PC confirms.
    state.volume = { volume: queued, muted: state.volume.muted };
    emit("volume:update", state.volume);

    const wait = SEND_INTERVAL - (Date.now() - lastSent);

    if (inFlight)
        return;

    if (wait > 0) {
        setTimeout(flush, wait);
        return;
    }

    flush();
}


export async function toggleMute() {
    return store(await post("/audio/mute", {}));
}


export async function adjustVolume(delta) {
    return store(await post("/audio/adjust", { delta: delta }));
}
