import state from "../js/state.js";

import { focusedApp, loadApps, runAppAction } from "../js/apps.js";
import { off, on } from "../js/events.js";
import { toast } from "../js/toast.js";

import openAppSheet from "./appSheet.js";


// How many of an app's actions fit on the home screen before the rest move
// behind "All actions"; four is two rows at 320px.
const INLINE = 4;


// The deck follows the PC: whatever window is in front puts its own controls at
// the top of the home screen, so the common case costs no taps at all.
export default function FocusCard() {
    const card = document.createElement("section");
    card.className = "glass card module module-focus focus-card";
    card.style.display = "none";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "IN FOCUS";

    const heading = document.createElement("h3");
    heading.className = "focus-name";

    const appIcon = document.createElement("span");
    appIcon.className = "focus-app-icon";

    const appName = document.createElement("span");
    appName.className = "focus-app-name";

    heading.appendChild(appIcon);
    heading.appendChild(appName);

    const title = document.createElement("p");
    title.className = "focus-title";

    const actions = document.createElement("div");
    actions.className = "focus-actions";

    card.appendChild(eyebrow);
    card.appendChild(heading);
    card.appendChild(title);
    card.appendChild(actions);

    function run(app, action) {
        return runAppAction(app.name, action.command, "home.focus").then(result => {
            toast(result && result.error ? result.error : (action.label || "Done"));
        });
    }

    function button(label, className) {
        const element = document.createElement("button");

        element.type = "button";
        element.className = className;
        element.textContent = label;

        return element;
    }

    function render() {
        const app = focusedApp();

        card.style.display = app ? "block" : "none";

        if (!app)
            return;

        appIcon.textContent = app.icon || "\u25C8";
        appName.textContent = app.name;
        title.textContent = state.foreground ? state.foreground.title || "" : "";

        while (actions.firstChild)
            actions.removeChild(actions.firstChild);

        const declared = Array.isArray(app.actions) ? app.actions : [];

        declared.slice(0, INLINE).forEach((action, index) => {
            const hierarchy = index === 0
                ? " focus-action-primary"
                : (index === 1 ? " focus-action-secondary" : " focus-action-compact");
            const element = button(action.label || "Action", "focus-action" + hierarchy);

            element.onclick = () => run(app, action);
            actions.appendChild(element);
        });

        if (declared.length > INLINE) {
            const more = button("All actions", "focus-action focus-more");

            more.onclick = () => openAppSheet(app);
            actions.appendChild(more);
        }
    }

    function repaint() {
        if (!card.parentNode) {
            off("apps:foreground", repaint);
            return;
        }

        render();
    }

    loadApps().then(render);
    on("apps:foreground", repaint);

    return card;
}
