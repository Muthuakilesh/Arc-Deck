import { isFavorite, launchApp, runAppAction, toggleFavorite } from "../js/apps.js";
import { toast } from "../js/toast.js";

import { closeSheet, sheetTitle, showSheet } from "./sheet.js";


function failure(result) {
    return result && result.error ? result.error : "";
}


function report(result, done) {
    const error = failure(result);

    if (error)
        toast(error);
    else
        toast(done);
}


function button(label, className) {
    const element = document.createElement("button");

    element.type = "button";
    element.className = className;
    element.textContent = label;

    return element;
}


// Only the app that is running can be focused or closed, and only the app that
// is not running is worth launching, so the header shows one pair or the other.
function header(app) {
    const row = document.createElement("div");
    row.className = "sheet-row";

    const favorite = button("", "sheet-secondary");
    const paintFavorite = () => {
        favorite.textContent = isFavorite(app.name)
            ? "Unfavorite"
            : "Favorite";
    };

    favorite.onclick = () => {
        const enabled = toggleFavorite(app.name);

        paintFavorite();
        toast(enabled ? "Added to favorites" : "Removed from favorites");
    };

    paintFavorite();

    if (app.running) {
        const focus = button("Bring to front", "sheet-primary");

        focus.onclick = () => {
            runAppAction(app.name, "focus").then(result => report(result, "Focused " + app.name));
            closeSheet();
        };

        const quit = button("Close", "sheet-secondary");

        quit.onclick = () => {
            runAppAction(app.name, "close").then(result => report(result, "Closed " + app.name));
            closeSheet();
        };

        row.appendChild(focus);
        row.appendChild(quit);
        row.appendChild(favorite);
    } else {
        const launch = button("Launch", "sheet-primary");

        launch.onclick = () => {
            launchApp(app.name).then(result => report(result, "Launched " + app.name));
            closeSheet();
        };

        row.appendChild(launch);
        row.appendChild(favorite);
    }

    return row;
}


export default function openAppSheet(app) {
    const children = [sheetTitle(app.name.toUpperCase()), header(app)];
    const actions = Array.isArray(app.actions) ? app.actions : [];

    if (actions.length) {
        const title = sheetTitle("ACTIONS");
        title.style.marginTop = "14px";

        const list = document.createElement("div");
        list.className = "sheet-actions";

        actions.forEach(action => {
            const element = button(action.label || "Action", "sheet-action");

            element.onclick = () => {
                runAppAction(app.name, action.command)
                    .then(result => report(result, action.label || "Done"));
                closeSheet();
            };

            list.appendChild(element);
        });

        children.push(title);
        children.push(list);
    }

    showSheet(children);
}
