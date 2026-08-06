import { getToken } from "./api.js";

import state from "./state.js";

import { emit, on } from "./events.js";

import { applyRunning } from "./apps.js";


let socket;


// Pointer frames go out on the open socket; a POST each would be a round trip
// per few pixels. Returns false when there is no socket, so the caller can fall
// back to the HTTP endpoint.
export function sendMouse(payload) {
    if (!socket || !socket.connected)
        return false;

    socket.emit("mouse", payload);
    return true;
}


export function connectSocket() {
    socket = io({ auth: { token: getToken() } });

    socket.on("connect", () => {
        state.connected = true;
        emit("connection", true);
    });

    socket.on("disconnect", () => {
        state.connected = false;
        emit("connection", false);
    });

    socket.on("connect_error", () => {
        state.connected = false;
        emit("connection", false);
    });

    socket.on("system_update", data => {
        state.system = data;
        state.connected = true;
        emit("system:update", data);
    });

    socket.on("apps_update", data => {
        applyRunning(data && data.running, data && data.foreground);
    });

    // The server refused the old token, so reconnect with the one just paired.
    on("auth:paired", () => {
        socket.auth = { token: getToken() };

        if (socket.connected)
            socket.disconnect();

        socket.connect();
    });
}
