import openAppSheet from "./appSheet.js";


// A 320px card cannot hold five action buttons, so the card is a single tap
// target and everything an app can do lives in its sheet.
export default function LauncherCard(app) {
    const card = document.createElement("button");

    card.type = "button";
    card.className = "glass card module module-launcher launcher-card";
    card.dataset.app = app.name || "";
    card.dataset.category = app.category || "apps";

    const icon = document.createElement("div");
    icon.className = "launcher-icon";
    if (app.image) {
        const image = document.createElement("img");
        image.src = app.image;
        image.alt = "";
        image.onerror = () => image.remove();
        icon.appendChild(image);
    }
    if (!icon.childNodes.length)
        icon.textContent = app.icon || "\u25C8";
    icon.setAttribute("aria-hidden", "true");

    const title = document.createElement("h3");
    title.textContent = app.name || "";

    const status = document.createElement("div");
    status.className = "launcher-status";

    const count = Array.isArray(app.actions) ? app.actions.length : 0;

    card.appendChild(icon);
    card.appendChild(title);
    card.appendChild(status);

    card.setRunning = running => {
        app.running = running;
        card.classList.toggle("running", running === true);
        status.textContent = running
            ? "Running"
            : (count ? count + " actions" : "Launch");
    };

    card.setRunning(app.running === true);

    card.onclick = () => openAppSheet(app);

    return card;
}
