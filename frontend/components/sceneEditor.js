import state from "../js/state.js";

import { deleteScene, saveScene } from "../js/scenes.js";
import { toast } from "../js/toast.js";

import { closeSheet, sheetTitle, showSheet } from "./sheet.js";
import { icon as renderIcon } from "./icon.js";


const ICONS = ["\u2726", "\u25CE", "\u266A", "\u2302", "\u2637", "\u25F7", "\u2691", "\u26A1"];

const DELAYS = [250, 500, 1000];

const TEMPLATES = [
    { id: "work", label: "Work", icon: "\u2302", apps: ["VSCode", "Chrome"], volume: 30, focus: 50 },
    { id: "focus", label: "Focus", icon: "\u25CE", apps: ["VSCode", "Chrome"], volume: 25, focus: 25 },
    { id: "gaming", label: "Gaming", icon: "\u26A1", apps: ["Steam", "Discord"], volume: 60 },
    { id: "movie", label: "Movie", icon: "\u266A", apps: ["Chrome"], volume: 45 },
    { id: "presentation", label: "Presentation", icon: "\u2691", apps: ["Chrome"], volume: 50 }
];


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
        steps: (source.steps || []).map(step => ({ ...step }))
    };
}


function draftFromTemplate(template) {
    const available = template.apps.filter(name => state.apps.some(app => app.name === name));
    const steps = [];

    available.forEach(name => {
        steps.push({ app: name, command: "launch", label: "Launch" });
        steps.push({ type: "wait_for_app", app: name, timeout: 5000 });
    });
    steps.push({ type: "audio_master", volume: template.volume });
    if (template.focus)
        steps.push({ type: "focus_timer", seconds: template.focus * 60, label: template.label });

    return { name: template.label, icon: template.icon, pinned: false, steps: steps };
}


function stepText(step) {
    if (step.type === "focus_timer")
        return `${step.label || "Focus"} timer \u00B7 ${Math.round(step.seconds / 60)}m`;
    if (step.type === "audio_master")
        return step.volume !== undefined ? `Master volume \u00B7 ${step.volume}%` : (step.muted ? "Mute master audio" : "Unmute master audio");
    if (step.type === "audio_app")
        return `${step.app} audio \u00B7 ${step.volume !== undefined ? step.volume + "%" : (step.muted ? "mute" : "unmute")}`;
    if (step.type === "wait_for_app")
        return `Wait for ${step.app}`;
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

    const wait = button("Wait until ready", "sheet-action");
    wait.onclick = () => {
        draft.steps.push({ type: "wait_for_app", app: app.name, timeout: 5000 });
        openSceneEditor(draft);
    };
    list.appendChild(wait);

    [25, 50, 75].forEach(volume => {
        const audio = button(`Set ${app.name} volume to ${volume}%`, "sheet-action");
        audio.onclick = () => {
            draft.steps.push({ type: "audio_app", app: app.name, volume: volume, missing: "skip" });
            openSceneEditor(draft);
        };
        list.appendChild(audio);
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

    const intentions = document.createElement("div");
    intentions.className = "sheet-actions";
    [{ label: "Focus for 25 minutes", step: { type: "focus_timer", seconds: 1500, label: "Focus" } },
        { label: "Focus for 50 minutes", step: { type: "focus_timer", seconds: 3000, label: "Focus" } },
        { label: "Master volume 25%", step: { type: "audio_master", volume: 25 } },
        { label: "Master volume 50%", step: { type: "audio_master", volume: 50 } },
        { label: "Mute master audio", step: { type: "audio_master", muted: true } }].forEach(entry => {
        const element = button(entry.label, "sheet-action");
        element.onclick = () => {
            draft.steps.push({ ...entry.step });
            openSceneEditor(draft);
        };
        intentions.appendChild(element);
    });

    const intentionsTitle = sheetTitle("INTENTIONS");
    intentionsTitle.style.marginTop = "14px";

    children.push(list);
    children.push(intentionsTitle);
    children.push(intentions);
    children.push(pause);
    children.push(delays);
    children.push(backRow(draft));

    showSheet(children);
}


export default function openSceneEditor(scene) {
    const draft = draftFrom(scene);
    const children = [sheetTitle(draft.id ? "EDIT SCENE" : "NEW SCENE")];

    if (!scene) {
        const templateTitle = sheetTitle("START FROM AN INTENTION");
        const templates = document.createElement("div");
        templateTitle.style.marginTop = "12px";
        templates.className = "sheet-actions scene-templates";
        TEMPLATES.forEach(template => {
            const element = button(template.icon + " " + template.label, "sheet-action");
            element.onclick = () => openSceneEditor(draftFromTemplate(template));
            templates.appendChild(element);
        });
        children.push(templateTitle);
        children.push(templates);
    }

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

        const remove = button("", "step-remove");
        remove.appendChild(renderIcon("close", { size: 14 }));
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
