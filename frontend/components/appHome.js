import { on, off } from "../js/events.js";
import state from "../js/state.js";
import { loadApps } from "../js/apps.js";
import { catalogForApps, defaultHomeApps } from "../js/appCatalog.js";
import AppTile from "./appTile.js";
import { iconMarkup } from "./icon.js";
import { closeSheet, sheetTitle, showSheet } from "./sheet.js";

const LAYOUT_KEY = "arcdeck.homeApps";
const DENSITY_KEY = "arcdeck.homeAppDensity";
const COLLAPSED_KEY = "arcdeck.homeAppsCollapsed";
const DEFAULT_DENSITY = "comfortable";

function readList() {
    try {
        const parsed = JSON.parse(localStorage.getItem(LAYOUT_KEY) || "null");
        return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : defaultHomeApps();
    } catch (error) {
        return defaultHomeApps();
    }
}

function readDensity() {
    try {
        const value = localStorage.getItem(DENSITY_KEY);
        return value === "compact" ? value : DEFAULT_DENSITY;
    } catch (error) {
        return DEFAULT_DENSITY;
    }
}

function write(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        // Local customization is optional.
    }
}

function writeDensity(value) {
    try {
        localStorage.setItem(DENSITY_KEY, value);
    } catch (error) {
        // Local customization is optional.
    }
}

function readCollapsed() {
    try {
        return localStorage.getItem(COLLAPSED_KEY) === "1";
    } catch (error) {
        return false;
    }
}

function writeCollapsed(value) {
    try {
        localStorage.setItem(COLLAPSED_KEY, value ? "1" : "0");
    } catch (error) {
        // Local customization is optional.
    }
}

export default function AppHome() {
    const section = document.createElement("section");
    section.className = "arc-app-home module";
    let order = readList();
    let density = readDensity();
    let collapsed = readCollapsed();
    let catalog = catalogForApps([]);
    let touchStartY = 0;

    section.innerHTML = "<div class='arc-app-home-heading'><div><p class='eyebrow'>ARC DECK / APPS</p><h2>Command center</h2><p class='arc-app-home-subtitle'>Your PC, personal space, and everyday controls in one place.</p></div><div class='arc-app-home-actions'><button type='button' class='icon-only-button arc-app-home-toggle' data-app-home-toggle title='Collapse command center' aria-label='Collapse command center'></button><button type='button' class='icon-only-button arc-app-home-edit' data-app-home-edit title='Customize app home' aria-label='Customize app home'></button></div></div><div class='arc-app-grid' data-app-grid></div>";
    const grid = section.querySelector("[data-app-grid]");
    const toggle = section.querySelector("[data-app-home-toggle]");
    const edit = section.querySelector("[data-app-home-edit]");
    edit.innerHTML = iconMarkup("edit", { size: 17 });

    const applyCollapsed = () => {
        section.classList.toggle("is-collapsed", collapsed);
        toggle.innerHTML = iconMarkup(collapsed ? "chevron-down" : "chevron-up", { size: 17 });
        toggle.title = collapsed ? "Open command center" : "Collapse command center";
        toggle.setAttribute("aria-label", collapsed ? "Open command center" : "Collapse command center");
    };

    const setCollapsed = value => {
        collapsed = value;
        writeCollapsed(collapsed);
        applyCollapsed();
    };

    const visibleEntries = () => {
        const byId = {};
        catalog.forEach(item => { byId[item.id] = item; });
        return order.map(id => byId[id]).filter(Boolean);
    };

    const render = () => {
        if (!section.parentNode)
            return;

        section.classList.toggle("is-compact", density === "compact");
        grid.innerHTML = "";
        visibleEntries().forEach(entry => grid.appendChild(AppTile(entry)));
        applyCollapsed();
    };

    const reset = () => {
        order = defaultHomeApps();
        density = DEFAULT_DENSITY;
        write(LAYOUT_KEY, order);
        writeDensity(density);
        render();
    };

    const openEditor = () => {
        const content = [sheetTitle("CUSTOMIZE APP HOME")];
        const note = document.createElement("p");
        note.className = "sheet-note";
        note.textContent = "Choose what stays one tap away. Drag apps to reorder them.";
        content.push(note);

        const list = document.createElement("div");
        list.className = "app-home-editor-list";
        const available = catalog.filter(item => item.kind === "capability");
        const redraw = () => {
            list.innerHTML = "";
            available.forEach(entry => {
                const row = document.createElement("div");
                row.className = "app-home-editor-row";
                row.draggable = true;
                row.dataset.appId = entry.id;
                const handle = document.createElement("button");
                handle.type = "button";
                handle.className = "sheet-secondary app-home-drag-handle";
                handle.textContent = "...";
                handle.title = `Drag ${entry.name}`;
                handle.setAttribute("aria-label", `Drag ${entry.name}`);
                const label = document.createElement("span");
                label.textContent = entry.name;
                const toggle = document.createElement("button");
                toggle.type = "button";
                toggle.className = "sheet-secondary";
                const enabled = order.includes(entry.id);
                toggle.textContent = enabled ? "On" : "Off";
                toggle.setAttribute("aria-label", `${enabled ? "Hide" : "Show"} ${entry.name}`);
                toggle.onclick = () => {
                    order = enabled ? order.filter(id => id !== entry.id) : [...order, entry.id];
                    write(LAYOUT_KEY, order);
                    render();
                    redraw();
                };
                row.append(handle, label, toggle);
                row.addEventListener("dragstart", event => {
                    event.dataTransfer.setData("text/plain", entry.id);
                });
                row.addEventListener("dragover", event => { event.preventDefault(); row.classList.add("is-drop-target"); });
                row.addEventListener("dragleave", () => row.classList.remove("is-drop-target"));
                row.addEventListener("drop", event => {
                    event.preventDefault();
                    row.classList.remove("is-drop-target");
                    const picked = event.dataTransfer.getData("text/plain");
                    const dragTo = order.indexOf(entry.id);
                    const from = order.indexOf(picked);
                    if (from >= 0 && dragTo >= 0) {
                        const next = order.slice();
                        next.splice(dragTo, 0, next.splice(from, 1)[0]);
                        order = next;
                        write(LAYOUT_KEY, order);
                        render();
                        redraw();
                    }
                });
                list.appendChild(row);
            });
        };

        redraw();
        content.push(list);

        const densityTitle = sheetTitle("GRID DENSITY");
        densityTitle.style.marginTop = "14px";
        const densityRow = document.createElement("div");
        densityRow.className = "sheet-row";
        ["comfortable", "compact"].forEach(value => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = value === density ? "sheet-primary" : "sheet-secondary";
            button.textContent = value === "comfortable" ? "Comfortable" : "Compact";
            button.onclick = () => {
                density = value;
                writeDensity(density);
                render();
                openEditor();
            };
            densityRow.appendChild(button);
        });
        content.push(densityTitle, densityRow);

        const actions = document.createElement("div");
        actions.className = "sheet-row";
        const resetButton = document.createElement("button");
        resetButton.type = "button";
        resetButton.className = "sheet-secondary";
        resetButton.textContent = "Reset apps";
        resetButton.onclick = () => { reset(); openEditor(); };
        const done = document.createElement("button");
        done.type = "button";
        done.className = "sheet-primary";
        done.textContent = "Done";
        done.onclick = closeSheet;
        actions.append(resetButton, done);
        content.push(actions);
        showSheet(content);
    };

    toggle.onclick = () => setCollapsed(!collapsed);
    edit.onclick = openEditor;
    section.addEventListener("touchstart", event => {
        if (event.target.closest("button, input, .arc-app-tile"))
            return;
        touchStartY = event.touches[0].clientY;
    }, { passive: true });
    section.addEventListener("touchend", event => {
        if (!touchStartY || event.target.closest("button, input, .arc-app-tile"))
            return;
        const distance = event.changedTouches[0].clientY - touchStartY;
        touchStartY = 0;
        if (distance < -42)
            setCollapsed(true);
        else if (distance > 42)
            setCollapsed(false);
    }, { passive: true });
    on("system:update", render);
    on("apps:running", render);

    loadApps().then(apps => {
        catalog = catalogForApps(apps);
        render();
    });

    section.addEventListener("DOMNodeRemoved", () => {
        off("system:update", render);
        off("apps:running", render);
    }, { once: true });

    applyCollapsed();
    render();
    return section;
}
