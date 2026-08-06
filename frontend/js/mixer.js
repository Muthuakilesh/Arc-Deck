import { get, post } from "./api.js";

import state from "./state.js";

import { emit } from "./events.js";


// Same reasoning as the master slider: a dragging finger outruns the PC, so one
// write per app is in flight at a time and the newest value wins. The queue is
// keyed by pid because two apps can be dragged in the same second.
const SEND_INTERVAL = 90;

const pending = {};
const inFlight = {};


export async function loadSessions() {
    const data = await get("/audio/sessions");

    state.sessions = data && data.sessions ? data.sessions : [];
    emit("mixer:update", state.sessions);

    return state.sessions;
}


function patch(session) {
    if (!session || session.error)
        return;

    state.sessions = state.sessions.map(item => {
        return item.pid === session.pid ? session : item;
    });
}


function flush(pid) {
    if (inFlight[pid] || pending[pid] === undefined)
        return;

    const value = pending[pid];

    delete pending[pid];
    inFlight[pid] = true;

    post("/audio/sessions/volume", { pid: pid, value: value }).then(result => {
        inFlight[pid] = false;
        patch(result);

        if (pending[pid] !== undefined)
            setTimeout(() => flush(pid), SEND_INTERVAL);
    });
}


export function setSessionVolume(pid, value) {
    pending[pid] = Math.max(0, Math.min(100, Math.round(value)));
    flush(pid);
}


export function setSessionMute(pid, muted) {
    return post("/audio/sessions/mute", { pid: pid, muted: muted }).then(result => {
        patch(result);
        return result;
    });
}
