import { get } from "./api.js";

import state from "./state.js";

import { emit } from "./events.js";


// The socket pushes stats every 2s; this poll is only a fallback for a dropped socket.
const POLL_INTERVAL = 5000;


export async function updateSystem() {
    const data = await get("/system");

    if (!data || data.error || typeof data.cpu !== "number") {
        state.connected = false;
        return;
    }

    state.system = data;
    state.connected = true;

    emit("system:update", data);
}


export function startSystemMonitor() {
    updateSystem();

    setInterval(() => {
        if (!state.connected)
            updateSystem();
    }, POLL_INTERVAL);
}
