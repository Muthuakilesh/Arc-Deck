import { getToken } from "./api.js";

import state from "./state.js";

import { emit, on } from "./events.js";

import { applyRunning } from "./apps.js";


let socket;


function clipboardPreference() {
    try {
        return window.localStorage.getItem("arcdeck.clipboardSync") === "1";
    } catch (error) {
        return false;
    }
}


// Pointer frames go out on the open socket; a POST each would be a round trip
// per few pixels. Returns false when there is no socket, so the caller can fall
// back to the HTTP endpoint.
export function sendMouse(payload) {
    if (!socket || !socket.connected)
        return false;

    socket.emit("mouse", payload);
    return true;
}


// Gamepad button edges, for the same reason as the pointer: the gap between
// pressing and the character moving is what makes a controller feel bad.
export function sendPad(payload) {
    if (!socket || !socket.connected)
        return false;

    socket.emit("pad", payload);
    return true;
}


export function setClipboardSync(enabled) {
    if (!socket || !socket.connected)
        return false;
    socket.emit("clipboard_sync", { enabled: Boolean(enabled) });
    return true;
}


export function sendClipboard(text) {
    if (!socket || !socket.connected)
        return false;
    socket.emit("clipboard_update", { text: String(text || "") });
    return true;
}


export function connectSocket() {
    socket = io({ auth: { token: getToken() } });

    socket.on("connect", () => {
        state.connected = true;
        emit("connection", true);
        state.clipboard.enabled = clipboardPreference();
        setClipboardSync(state.clipboard.enabled);
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

    socket.on("clipboard_state", data => {
        state.clipboard = {
            enabled: state.clipboard.enabled,
            available: Boolean(data && data.available),
            text: data && typeof data.text === "string" ? data.text : "",
            version: data && data.version || 0,
            source: data && data.source || "sync"
        };
        emit("clipboard:update", state.clipboard);
    });

    socket.on("clipboard_error", data => {
        emit("clipboard:error", data && data.error ? data.error : "Clipboard sync failed");
    });

    // The server refused the old token, so reconnect with the one just paired.
    on("auth:paired", () => {
        socket.auth = { token: getToken() };

        if (socket.connected)
            socket.disconnect();

        socket.connect();
    });
}
