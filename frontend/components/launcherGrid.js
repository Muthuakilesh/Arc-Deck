import { loadApps } from "../js/apps.js";
import { off, on } from "../js/events.js";

import LauncherCard from "./launcherCard.js";


export default function LauncherGrid(keep) {
    const grid = document.createElement("div");
    grid.className = "launcher-grid";

    const cards = {};

    loadApps().then(apps => {
        apps.filter(keep).forEach(app => {
            const card = LauncherCard(app);

            cards[String(app.name).toLowerCase()] = card;
            grid.appendChild(card);
        });
    });

    // The PC pushes the running set every few seconds; repaint the badges in
    // place instead of rebuilding the grid under the user's thumb.
    function repaint(apps) {
        // Navigation throws the old grid away; drop its subscription with it.
        if (!grid.parentNode) {
            off("apps:running", repaint);
            return;
        }

        apps.forEach(app => {
            const card = cards[String(app.name).toLowerCase()];

            if (card)
                card.setRunning(app.running === true);
        });
    }

    on("apps:running", repaint);

    return grid;
}
