import { loadApps } from "../js/apps.js";
import { off, on } from "../js/events.js";

import openAppSheet from "./appSheet.js";


// What is open on the PC right now, one tap from the app's own controls. The
// card hides itself while nothing is running so the home screen stays short.
export default function RunningStrip() {
    const card = document.createElement("div");
    card.className = "glass card module module-running running-strip";
    card.style.display = "none";

    const title = document.createElement("p");
    title.className = "eyebrow";
    title.textContent = "RUNNING NOW";

    const row = document.createElement("div");
    row.className = "chip-row";

    card.appendChild(title);
    card.appendChild(row);

    function render(apps) {
        while (row.firstChild)
            row.removeChild(row.firstChild);

        const running = apps.filter(app => app.running === true);

        card.style.display = running.length ? "block" : "none";

        running.forEach(app => {
            const chip = document.createElement("button");

            chip.type = "button";
            chip.className = "chip";
            chip.textContent = (app.icon ? app.icon + " " : "") + app.name;
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
