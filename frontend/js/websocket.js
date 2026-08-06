import { getToken } from "./api.js";

import state from "./state.js";

import { emit } from "./events.js";


let socket;


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
}
