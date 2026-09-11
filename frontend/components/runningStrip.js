import { loadApps } from "../js/apps.js";
import { off, on } from "../js/events.js";

import openAppSheet from "./appSheet.js";


// What is open on the PC right now, one tap from the app's own controls. The
// card hides itself while nothing is running so the home screen stays short.
export default function RunningStrip() {
    const card = document.createElement("div");
    card.className = "glass card module module-running running-strip";
    card.style.display = "none";

    const heading = document.createElement("div");
    heading.className = "module-heading";
    heading.innerHTML = "<div><p class='eyebrow'>ACTIVE SESSION</p><h2>Running now</h2></div><span class='running-indicator'><span></span>Live</span>";

    const row = document.createElement("div");
    row.className = "chip-row";

    card.appendChild(heading);
    card.appendChild(row);

    function render(apps) {
        while (row.firstChild)
            row.removeChild(row.firstChild);

        const running = apps.filter(app => app.running === true);

        card.style.display = running.length ? "block" : "none";

        running.forEach(app => {
            const chip = document.createElement("button");
            const appIcon = document.createElement("span");
            const appName = document.createElement("span");
            const statusDot = document.createElement("span");

            chip.type = "button";
            chip.className = "chip";
            appIcon.className = "running-app-icon";
            appIcon.textContent = app.icon || "\u25C8";
            appName.textContent = app.name;
            statusDot.className = "running-app-dot";
            chip.append(appIcon, appName, statusDot);
            chip.onclick = () => openAppSheet(app);

            row.appendChild(chip);
        });
    }

    function repaint(apps) {
        if (!card.parentNode) {
            off("apps:running", repaint);
            return;
        }

        render(apps);
    }

    loadApps().then(render);
    on("apps:running", repaint);

    return card;
}
