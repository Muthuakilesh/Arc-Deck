import state from "../js/state.js";

import { on } from "../js/events.js";
import { iconMarkup } from "./icon.js";


function label(connected) {
    return connected ? "Connected" : "Offline";
}


function now() {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}


export default function TopBar() {
    const bar = document.createElement("div");
    bar.className = "glass card topbar";

    bar.innerHTML = `
        <div class="brand">
            <span class="logo">${iconMarkup("brand", { size: 18 })}</span>
            <span>ArcDeck</span>
        </div>
        <div class="status">
            <span class="online-dot"></span>
            <span id="connection">${state.connected ? "Connected" : "Connecting&hellip;"}</span>
            <span id="clock">${now()}</span>
        </div>`;

    // Navigation rebuilds this bar, and 'connection' only fires on a socket change,
    // so the initial text has to come from the state rather than a placeholder.
    const text = bar.querySelector("#connection");

    on("connection", connected => {
        if (bar.isConnected)
            text.textContent = label(connected);
    });

    return bar;
}
