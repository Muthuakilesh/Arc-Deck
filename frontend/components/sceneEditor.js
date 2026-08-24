import state from "../js/state.js";

import { deleteScene, saveScene } from "../js/scenes.js";
import { toast } from "../js/toast.js";

import { closeSheet, sheetTitle, showSheet } from "./sheet.js";


const ICONS = ["\u2726", "\u25CE", "\u266A", "\u2302", "\u2637", "\u25F7", "\u2691", "\u26A1"];

const DELAYS = [250, 500, 1000];


function button(label, className) {
    const element = document.createElement("button");

    element.type = "button";
    element.className = className;
    element.textContent = label;

    return element;
}


function draftFrom(scene) {
    const source = scene || {};

    return {
        id: source.id,
        name: source.name || "",
        icon: source.icon || ICONS[0],
        pinned: Boolean(source.pinned),
        steps: (source.steps || []).map(step => {
            return { app: step.app, command: step.command, delay: step.delay, label: step.label };
        })
    };
}


function stepText(step) {
    if (!step.app)
        return "Wait " + step.delay + "ms";

    return step.app + " \u00B7 " + (step.label || step.command);
}


// A scene can only be built out of actions an app already declares, so the
// editor picks from those lists rather than letting the phone type a command.
function openActionPicker(draft, app) {
    const children = [sheetTitle(String(app.name).toUpperCase())];

    const list = document.createElement("div");
    list.className = "sheet-actions";

    const offered = [{ label: "Launch", command: "launch" }, { label: "Bring to front", command: "focus" }, { label: "Close", command: "close" }]
        .concat(Array.isArray(app.actions) ? app.actions : []);

    offered.forEach(action => {
        const element = button(action.label || "Action", "sheet-action");

        element.onclick = () => {
            draft.steps.push({ app: app.name, command: action.command, label: action.label || "" });
            openSceneEditor(draft);
        };

        list.appendChild(element);
    });

    children.push(list);
    children.push(backRow(draft));

    showSheet(children);
}


function backRow(draft) {
    const row = document.createElement("div");
    row.className = "sheet-row";
    row.style.marginTop = "12px";

    const back = button("Back", "sheet-secondary");
    back.onclick = () => openSceneEditor(draft);

    row.appendChild(back);

    return row;
}

function openPreview(draft) {
    const children = [sheetTitle("DRY RUN PREVIEW")];
    const summary = document.createElement("p");
    summary.className = "mix-empty";

    const totalDelay = draft.steps.reduce((sum, step) => {
        return sum + (step.delay && !step.app ? Number(step.delay) : 0);
    }, 0);

    summary.textContent = "Steps: " + draft.steps.length + " \u00b7 delay: " + totalDelay + "ms";

    const list = document.createElement("div");
    list.className = "step-list";

    draft.steps.forEach((step, index) => {
        const row = document.createElement("div");
        row.className = "step-row";

        const text = document.createElement("span");
        text.className = "step-text";
        text.textContent = index + 1 + ". " + stepText(step);

        row.appendChild(text);
        list.appendChild(row);
    });

    children.push(summary);
    children.push(list);
    children.push(backRow(draft));

    showSheet(children);
}


function openStepPicker(draft) {
    const children = [sheetTitle("ADD A STEP")];

    const list = document.createElement("div");
    list.className = "sheet-actions";

    state.apps.forEach(app => {
        const element = button((app.icon ? app.icon + " " : "") + app.name, "sheet-action");

        element.onclick = () => openActionPicker(draft, app);
        list.appendChild(element);
    });

    const delays = document.createElement("div");
    delays.className = "sheet-actions";

    DELAYS.forEach(delay => {
        const element = button("Wait " + delay + "ms", "sheet-action");

        element.onclick = () => {
            draft.steps.push({ delay: delay });
            openSceneEditor(draft);
        };

        delays.appendChild(element);
    });

    const pause = sheetTitle("PAUSE");
    pause.style.marginTop = "14px";

    children.push(list);
    children.push(pause);
    children.push(delays);
    children.push(backRow(draft));

    showSheet(children);
}


export default function openSceneEditor(scene) {
    const draft = draftFrom(scene);
    const children = [sheetTitle(draft.id ? "EDIT SCENE" : "NEW SCENE")];

    const name = document.createElement("input");
    name.type = "text";
    name.className = "scene-name";
    name.value = draft.name;
    name.placeholder = "Scene name";
    name.setAttribute("aria-label", "Scene name");
    name.oninput = () => {
        draft.name = name.value;
    };

    const icons = document.createElement("div");
    icons.className = "icon-row";

    ICONS.forEach(icon => {
        const element = button(icon, "icon-pick");

        if (icon === draft.icon)
            element.classList.add("active");

        element.onclick = () => {
            draft.icon = icon;
            openSceneEditor(draft);
        };

        icons.appendChild(element);
    });

    const steps = document.createElement("div");
    steps.className = "step-list";

    draft.steps.forEach((step, index) => {
        const row = document.createElement("div");
        row.className = "step-row";

        const text = document.createElement("span");
        text.className = "step-text";
        text.textContent = index + 1 + ". " + stepText(step);

        const remove = button("\u2715", "step-remove");
        remove.setAttribute("aria-label", "Remove step");
        remove.onclick = () => {
            draft.steps.splice(index, 1);
            openSceneEditor(draft);
        };

        row.appendChild(text);
        row.appendChild(remove);
        steps.appendChild(row);
    });

    if (!draft.steps.length) {
        const empty = document.createElement("p");
        empty.className = "mix-empty";
        empty.textContent = "No steps yet.";
        steps.appendChild(empty);
    }

    const add = button("Add step", "sheet-action");
    add.onclick = () => openStepPicker(draft);

    const preview = button("Preview", "sheet-action");
    preview.onclick = () => openPreview(draft);

    const pin = button(draft.pinned ? "Pinned to home" : "Pin to home", "sheet-action");

    if (draft.pinned)
        pin.classList.add("active");

    pin.onclick = () => {
        draft.pinned = !draft.pinned;
        openSceneEditor(draft);
    };

    const row = document.createElement("div");
    row.className = "sheet-row";
    row.style.marginTop = "12px";

    const save = button("Save", "sheet-primary");

    save.onclick = () => {
        saveScene(draft).then(result => {
            if (result && result.error) {
                toast(result.error);
                return;
            }

            closeSheet();
            toast("Saved " + draft.name);
        });
    };

    row.appendChild(save);

    if (draft.id) {
        const remove = button("Delete", "sheet-secondary");

        remove.onclick = () => {
            deleteScene(draft.id).then(() => {
                closeSheet();
                toast("Deleted " + draft.name);
            });
        };

        row.appendChild(remove);
    }

    const stepsTitle = sheetTitle("STEPS");
    stepsTitle.style.marginTop = "14px";

    children.push(name);
    children.push(icons);
    children.push(stepsTitle);
    children.push(steps);
    children.push(add);
    children.push(preview);
    children.push(pin);
    children.push(row);

    showSheet(children);
}
