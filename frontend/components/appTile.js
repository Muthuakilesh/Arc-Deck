import router from "../js/router.js";
import { iconMarkup } from "./icon.js";
import openAppSheet from "./appSheet.js";
import { on, off } from "../js/events.js";
import state from "../js/state.js";

export default function AppTile(entry, options = {}) {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "arc-app-tile glass card";
    tile.dataset.appId = entry.id;
    tile.dataset.category = entry.category;

    const icon = document.createElement("span");
    icon.className = "arc-app-icon";
    if (entry.image) {
        const image = document.createElement("img");
        image.src = entry.image;
        image.alt = "";
        image.onerror = () => image.remove();
        icon.appendChild(image);
    }
    if (!icon.childNodes.length)
        icon.innerHTML = iconMarkup(entry.icon || "app", { size: 22 });

    const copy = document.createElement("span");
    copy.className = "arc-app-copy";

    const name = document.createElement("strong");
    name.textContent = entry.name;

    const status = document.createElement("small");
    status.className = "arc-app-status";

    copy.append(name, status);
    tile.append(icon, copy);

    const paint = () => {
        status.textContent = typeof entry.status === "function" ? entry.status(state) : (entry.status || "");
        tile.classList.toggle("is-running", entry.kind === "desktop" && entry.app && entry.app.running === true);
    };

    tile.onclick = () => {
        if (entry.kind === "desktop")
            openAppSheet(entry.app);
        else if (entry.route)
            router.navigate(entry.route);
    };

    paint();
    if (options.live !== false) {
        ["system:update", "apps:running", "apps:foreground"].forEach(event => on(event, paint));
        tile.addEventListener("DOMNodeRemoved", () => {
            ["system:update", "apps:running", "apps:foreground"].forEach(event => off(event, paint));
        }, { once: true });
    }

    return tile;
}
