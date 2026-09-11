import { isFavorite, launchApp, runAppAction, toggleFavorite } from "../js/apps.js";
import { toast } from "../js/toast.js";

import { closeSheet, sheetTitle, showSheet } from "./sheet.js";
import { post } from "../js/api.js";


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

    if (app.category === "games") {
        const edit = button("Edit game", "sheet-secondary");
        edit.onclick = () => openGameEditor(app);
        row.appendChild(edit);
    }

    if (app.running) {
        const focus = button("Bring to front", "sheet-primary");

        focus.onclick = () => {
            runAppAction(app.name, "focus", "app.sheet").then(result => report(result, "Focused " + app.name));
            closeSheet();
        };

        const quit = button("Close", "sheet-secondary");

        quit.onclick = () => {
            runAppAction(app.name, "close", "app.sheet").then(result => report(result, "Closed " + app.name));
            closeSheet();
        };

        row.appendChild(focus);
        row.appendChild(quit);
        row.appendChild(favorite);
    } else {
        const launch = button("Launch", "sheet-primary");

        launch.onclick = () => {
            launchApp(app.name, "app.sheet").then(result => report(result, "Launched " + app.name));
            closeSheet();
        };

        row.appendChild(launch);
        row.appendChild(favorite);
    }

    return row;
}


export function openGameEditor(app = {}) {
    const editing = Boolean(app.name);
    const name = document.createElement("input");
    const path = document.createElement("input");
    const process = document.createElement("input");
    const image = document.createElement("input");
    const icon = document.createElement("input");
    const preview = document.createElement("div");
    const form = document.createElement("div");
    const error = document.createElement("p");

    form.className = "game-editor-form";
    error.className = "game-editor-error";
    error.setAttribute("aria-live", "polite");

    const field = (labelText, input, hint) => {
        const wrapper = document.createElement("label");
        const label = document.createElement("span");
        const note = document.createElement("small");
        wrapper.className = "game-editor-field";
        label.textContent = labelText;
        note.textContent = hint || "";
        input.type = "text";
        input.className = "game-editor-input";
        wrapper.append(label, input, note);
        return wrapper;
    };

    name.value = app.name || "";
    name.placeholder = "Game name";
    path.value = app.path || "";
    path.placeholder = "C:\\Games\\Example\\game.exe";
    process.value = app.process || "";
    process.placeholder = "game.exe (optional)";
    image.value = app.image || "";
    image.placeholder = "https://... or /images/ui/game.png";
    icon.value = app.icon || "🎮";
    icon.maxLength = 8;

    preview.className = "game-editor-preview launcher-icon";
    const paintPreview = () => {
        preview.innerHTML = "";
        if (image.value.trim()) {
            const imageNode = document.createElement("img");
            imageNode.src = image.value.trim();
            imageNode.alt = "Game image preview";
            imageNode.onerror = () => {
                preview.innerHTML = "";
                preview.textContent = icon.value || "🎮";
            };
            preview.appendChild(imageNode);
        } else preview.textContent = icon.value || "🎮";
    };
    image.oninput = paintPreview;
    icon.oninput = paintPreview;
    paintPreview();

    form.appendChild(preview);
    form.appendChild(field("Game name", name, "Shown in the Games library."));
    form.appendChild(field("Executable path", path, "The .exe or launcher shortcut on the PC."));
    form.appendChild(field("Process name", process, "Optional. Used to show running status and focus."));
    form.appendChild(field("Image", image, "Use an HTTPS URL or a local /images/... path."));
    form.appendChild(field("Fallback icon", icon, "Used when the image cannot load."));
    form.appendChild(error);

    const actions = document.createElement("div");
    actions.className = "sheet-row game-editor-actions";
    const cancel = button("Cancel", "sheet-secondary");
    const save = button(editing ? "Save changes" : "Add game", "sheet-primary");
    cancel.onclick = closeSheet;
    save.onclick = () => {
        error.textContent = "";
        if (!name.value.trim() || !path.value.trim()) {
            error.textContent = "Game name and executable path are required.";
            return;
        }
        save.disabled = true;
        post("/apps/custom", {
            name: name.value.trim(),
            path: path.value.trim(),
            process: process.value.trim(),
            image: image.value.trim(),
            icon: icon.value.trim() || "🎮"
        }).then(result => {
            if (result && !result.error) {
                closeSheet();
                window.location.reload();
            } else {
                save.disabled = false;
                error.textContent = (result && result.error) || "Could not save game.";
            }
        });
    };
    actions.append(cancel, save);

    showSheet([
        sheetTitle(editing ? "EDIT GAME" : "ADD GAME"),
        form,
        actions
    ]);
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
                runAppAction(app.name, action.command, "app.sheet")
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
