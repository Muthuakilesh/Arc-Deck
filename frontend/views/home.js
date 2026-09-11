import mountChrome from "../js/chrome.js";
import HeroCard from "../components/heroCard.js";
import GlassCard, { paintStatGauge, statGaugeMarkup } from "../components/glassCard.js";
import FocusCard from "../components/focusCard.js";
import RunningStrip from "../components/runningStrip.js";
import SceneStrip from "../components/sceneStrip.js";
import VolumeControl from "../components/volumeControl.js";
import LauncherCard from "../components/launcherCard.js";
import ContextHub from "../components/contextHub.js";
import { closeSheet, sheetTitle, showSheet } from "../components/sheet.js";
import { icon as renderIcon, iconMarkup } from "../components/icon.js";
import { THEMES, applyTheme, currentTheme } from "../js/theme.js";
import { clearActivityEvents, loadActivityEvents, loadActivitySettings, saveActivitySettings } from "../js/activity.js";

import { off, on } from "../js/events.js";
import { getFavoriteNames, getRecentNames, loadApps } from "../js/apps.js";
import state from "../js/state.js";

const LAYOUT_KEY = "arcdeck.homeLayout";
const FREE_LAYOUT_KEY = "arcdeck.homeFreeLayout";
const FREE_POSITIONS_KEY = "arcdeck.homeFreePositions";
const CHECKLIST_KEY = "arcdeck.utilChecklist";
const NOTES_KEY = "arcdeck.utilNotes";
const STREAK_KEY = "arcdeck.utilStreak";
const ONBOARDING_KEY = "arcdeck.onboardingSeen";
const PROFILE_KEYS = [
    "arcdeck.theme",
    LAYOUT_KEY,
    "arcdeck.clockPresetSeconds",
    "arcdeck.clockLandscape",
    "arcdeck.clockNeon",
    "arcdeck.clockStyle",
    "arcdeck.clock24h",
    "arcdeck.clockSeconds",
    "arcdeck.clockDate",
    "arcdeck.clockStandby",
    "arcdeck.clockMotion",
    "arcdeck.clockDim",
    FREE_LAYOUT_KEY,
    FREE_POSITIONS_KEY,
    CHECKLIST_KEY,
    NOTES_KEY,
    STREAK_KEY
];
const DEFAULT_LAYOUT = [
    { id: "hero", label: "Hero", visible: true },
    { id: "context", label: "Right Now", visible: true },
    { id: "focus", label: "In Focus", visible: true },
    { id: "stats", label: "Stats", visible: true },
    { id: "favorites", label: "Favorites", visible: true },
    { id: "recents", label: "Recents", visible: true },
    { id: "scenes", label: "Scenes", visible: true },
    { id: "running", label: "Running Apps", visible: true },
    { id: "volume", label: "Volume", visible: true },
    { id: "checklist", label: "Checklist", visible: true },
    { id: "streak", label: "Streak", visible: true },
    { id: "notes", label: "Notes", visible: true }
];

function loadJson(key, fallback) {
    try {
        const raw = localStorage.getItem(key);

        if (!raw)
            return fallback;

        const parsed = JSON.parse(raw);

        return parsed == null ? fallback : parsed;
    } catch (error) {
        return fallback;
    }
}

function saveJson(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        // Preference persistence is optional.
    }
}

function loadFreeLayout() {
    try {
        return localStorage.getItem(FREE_LAYOUT_KEY) === "1";
    } catch (error) {
        return false;
    }
}

function saveFreeLayout(value) {
    try {
        localStorage.setItem(FREE_LAYOUT_KEY, value ? "1" : "0");
    } catch (error) {
        // Preference persistence is optional.
    }
}

function loadFreePositions() {
    const parsed = loadJson(FREE_POSITIONS_KEY, {});

    return parsed && typeof parsed === "object" ? parsed : {};
}

function saveFreePositions(value) {
    saveJson(FREE_POSITIONS_KEY, value || {});
}

function todayStamp() {
    return new Date().toISOString().slice(0, 10);
}

function previousDayStamp() {
    const day = new Date();

    day.setDate(day.getDate() - 1);
    return day.toISOString().slice(0, 10);
}

function loadLayout() {
    try {
        const raw = localStorage.getItem(LAYOUT_KEY);
        const parsed = raw ? JSON.parse(raw) : null;

        if (!Array.isArray(parsed) || !parsed.length)
            return DEFAULT_LAYOUT.map(item => ({ ...item }));

        const known = {};
        DEFAULT_LAYOUT.forEach(item => {
            known[item.id] = item;
        });

        const next = parsed.map(item => {
            if (!item || !known[item.id])
                return null;

            return {
                id: item.id,
                label: known[item.id].label,
                visible: item.visible !== false
            };
        }).filter(Boolean);

        DEFAULT_LAYOUT.forEach(item => {
            if (!next.some(entry => entry.id === item.id))
                next.push({ ...item });
        });

        return next;
    } catch (error) {
        return DEFAULT_LAYOUT.map(item => ({ ...item }));
    }
}

function saveLayout(layout) {
    try {
        localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
    } catch (error) {
        // Preference persistence is optional.
    }
}

function moveLayoutItem(layout, fromIndex, toIndex) {
    if (fromIndex === toIndex)
        return false;

    if (fromIndex < 0 || toIndex < 0)
        return false;

    if (fromIndex >= layout.length || toIndex >= layout.length)
        return false;

    const picked = layout.splice(fromIndex, 1)[0];

    layout.splice(toIndex, 0, picked);
    return true;
}

export default function Home() {
    const page = document.createElement("div");
    page.className = "home page ios-modular-page";

    let layout = loadLayout();
    let freeLayout = loadFreeLayout();
    let freePositions = loadFreePositions();
    let checklist = loadJson(CHECKLIST_KEY, []);
    let notes = String(loadJson(NOTES_KEY, "") || "");
    let streak = loadJson(STREAK_KEY, { count: 0, lastDate: "" });

    const nodes = {};
    const dragState = { id: "", pointerId: 0, offsetX: 0, offsetY: 0 };

    mountChrome();

    const settingsBar = document.createElement("div");
    settingsBar.className = "home-settings-bar";
    settingsBar.innerHTML = "<button type='button' class='control-button icon-only-button home-settings-button' title='Home settings' aria-label='Home settings' data-home-settings>\u2699</button>";
    page.appendChild(settingsBar);

    if (!localStorage.getItem(ONBOARDING_KEY)) {
        const onboarding = document.createElement("div");
        onboarding.className = "glass card module onboarding-banner";
        onboarding.innerHTML = "<span class='onboarding-icon'>" + iconMarkup("brand", { size: 18 }) + "</span>" +
            "<p><strong>ArcDeck is ready</strong><small>Focused controls appear here. Find every workspace under More.</small></p>" +
            "<button type='button' class='icon-only-button' data-onboarding-dismiss title='Dismiss' aria-label='Dismiss'>" + iconMarkup("close", { size: 16 }) + "</button>";
        onboarding.querySelector("[data-onboarding-dismiss]").onclick = () => {
            try {
                localStorage.setItem(ONBOARDING_KEY, "1");
            } catch (error) {
                // Preference persistence is optional.
            }

            onboarding.remove();
        };
        page.appendChild(onboarding);
    }

    const renderLookChips = themeChips => {
        themeChips.innerHTML = "";

        THEMES.forEach(theme => {
            const button = document.createElement("button");
            const dot = document.createElement("span");

            button.type = "button";
            button.className = "home-look-chip";
            button.classList.toggle("active", currentTheme() === theme.id);
            button.textContent = theme.label;
            button.onclick = () => {
                applyTheme(theme.id);
                renderLookChips(themeChips);
            };

            dot.className = "home-look-dot";
            dot.style.color = theme.swatch;
            dot.textContent = "\u25CF";
            button.insertBefore(dot, button.firstChild);
            themeChips.appendChild(button);
        });
    };

    const widgetHost = document.createElement("div");
    widgetHost.className = "home-widget-host";
    page.appendChild(widgetHost);

    const exportProfile = async exportButton => {
        const settings = {};

        PROFILE_KEYS.forEach(key => {
            const value = localStorage.getItem(key);

            if (value !== null)
                settings[key] = value;
        });

        const payload = JSON.stringify({ version: 1, settings: settings }, null, 2);

        if (navigator.clipboard && navigator.clipboard.writeText) {
            try {
                await navigator.clipboard.writeText(payload);
                exportButton.textContent = "\u2713";
                window.setTimeout(() => {
                    exportButton.textContent = "\u2B06";
                }, 900);
                return;
            } catch (error) {
                // Fallback to prompt if clipboard permission is denied.
            }
        }

        window.prompt("Copy your Arc-Deck profile JSON", payload);
    };

    const importProfile = importButton => {
        const raw = window.prompt("Paste Arc-Deck profile JSON");

        if (!raw)
            return;

        try {
            const parsed = JSON.parse(raw);
            const settings = parsed && parsed.settings;

            if (!settings || typeof settings !== "object") {
                importButton.textContent = "!";
                window.setTimeout(() => {
                    importButton.textContent = "\u2B07";
                }, 900);
                return;
            }

            PROFILE_KEYS.forEach(key => {
                if (typeof settings[key] === "string")
                    localStorage.setItem(key, settings[key]);
            });

            applyTheme(localStorage.getItem("arcdeck.theme"));
            window.location.reload();
        } catch (error) {
            importButton.textContent = "!";
            window.setTimeout(() => {
                importButton.textContent = "\u2B07";
            }, 900);
        }
    };

    nodes.hero = HeroCard();
    nodes.hero.dataset.widgetId = "hero";
    nodes.context = ContextHub();
    nodes.context.dataset.widgetId = "context";

    // small summary widgets
    const widgets = document.createElement("div");
    widgets.className = "widgets module module-stats";
    const statsHeading = document.createElement("div");
    statsHeading.className = "module-heading stats-heading";
    statsHeading.innerHTML = "<div><p class='eyebrow'>SYSTEM PULSE</p><h2>Performance</h2></div><span class='module-status'><span></span>Live</span>";
    const statsGrid = document.createElement("div");
    statsGrid.className = "stats-grid";
    const cpu = GlassCard({ title: "CPU", content: statGaugeMarkup("cpu") });
    const ram = GlassCard({ title: "RAM", content: statGaugeMarkup("ram") });
    const disk = GlassCard({ title: "Disk", content: statGaugeMarkup("disk") });
    cpu.classList.add("stat-metric", "stat-cpu");
    ram.classList.add("stat-metric", "stat-ram");
    disk.classList.add("stat-metric", "stat-disk");
    statsGrid.append(cpu, ram, disk);
    widgets.append(statsHeading, statsGrid);
    nodes.stats = widgets;
    nodes.stats.dataset.widgetId = "stats";

    const favoritesSection = document.createElement("section");
    favoritesSection.className = "quick-apps card glass module module-favorites";
    favoritesSection.innerHTML = "<div class='module-heading'><div><p class='eyebrow'>PINNED</p><h2>Favorites</h2></div><span class='section-index'>01</span></div>";
    const favoritesGrid = document.createElement("div");
    favoritesGrid.className = "quick-apps-grid";
    favoritesSection.appendChild(favoritesGrid);
    nodes.favorites = favoritesSection;
    nodes.favorites.dataset.widgetId = "favorites";

    const recentsSection = document.createElement("section");
    recentsSection.className = "quick-apps card glass module module-recents";
    recentsSection.innerHTML = "<div class='module-heading'><div><p class='eyebrow'>HISTORY</p><h2>Recent apps</h2></div><span class='section-index'>02</span></div>";
    const recentsGrid = document.createElement("div");
    recentsGrid.className = "quick-apps-grid";
    recentsSection.appendChild(recentsGrid);
    nodes.recents = recentsSection;
    nodes.recents.dataset.widgetId = "recents";

    nodes.focus = FocusCard();
    nodes.focus.dataset.widgetId = "focus";
    nodes.scenes = SceneStrip();
    nodes.scenes.dataset.widgetId = "scenes";
    nodes.running = RunningStrip();
    nodes.running.dataset.widgetId = "running";
    nodes.volume = VolumeControl();
    nodes.volume.dataset.widgetId = "volume";

    const checklistSection = document.createElement("section");
    checklistSection.className = "utility-card card glass module module-utility";
    checklistSection.innerHTML = "<p class='eyebrow'>CHECKLIST</p><div class='utility-checklist-list' data-checklist-list></div><div class='utility-checklist-add'><input type='text' maxlength='60' placeholder='Add task'><button type='button' class='control-button icon-only-button' title='Add task' aria-label='Add task'>+</button></div>";
    const checklistList = checklistSection.querySelector("[data-checklist-list]");
    const checklistInput = checklistSection.querySelector("input");
    const checklistAdd = checklistSection.querySelector("button");

    const saveChecklist = () => {
        saveJson(CHECKLIST_KEY, checklist);
    };

    const renderChecklist = () => {
        checklistList.innerHTML = "";

        if (!checklist.length) {
            const empty = document.createElement("p");
            empty.className = "utility-empty";
            empty.textContent = "No tasks yet.";
            checklistList.appendChild(empty);
            return;
        }

        checklist.forEach(item => {
            const row = document.createElement("div");
            const done = document.createElement("button");
            const text = document.createElement("span");
            const remove = document.createElement("button");

            row.className = "utility-checklist-row";

            done.type = "button";
            done.className = "utility-small-button" + (item.done ? " is-done" : "");
            done.innerHTML = item.done ? iconMarkup("check", { size: 14 }) : "";
            done.title = item.done ? "Mark task open" : "Mark task done";
            done.setAttribute("aria-label", item.done ? "Mark task open" : "Mark task done");
            done.onclick = () => {
                item.done = !item.done;
                saveChecklist();
                renderChecklist();
            };

            text.className = "utility-checklist-text" + (item.done ? " is-done" : "");
            text.textContent = item.text;

            remove.type = "button";
            remove.className = "utility-small-button";
            remove.innerHTML = iconMarkup("close", { size: 13 });
            remove.title = "Remove task";
            remove.setAttribute("aria-label", "Remove task");
            remove.onclick = () => {
                checklist = checklist.filter(entry => entry.id !== item.id);
                saveChecklist();
                renderChecklist();
            };

            row.appendChild(done);
            row.appendChild(text);
            row.appendChild(remove);
            checklistList.appendChild(row);
        });
    };

    const addChecklistItem = () => {
        const text = String(checklistInput.value || "").trim();

        if (!text)
            return;

        checklist.push({ id: Date.now() + Math.random(), text: text, done: false });
        checklistInput.value = "";
        saveChecklist();
        renderChecklist();
    };

    checklistAdd.onclick = addChecklistItem;
    checklistInput.onkeydown = event => {
        if (event.key === "Enter")
            addChecklistItem();
    };

    renderChecklist();
    nodes.checklist = checklistSection;
    nodes.checklist.dataset.widgetId = "checklist";

    const streakSection = document.createElement("section");
    streakSection.className = "utility-card card glass module module-utility";
    streakSection.innerHTML = "<p class='eyebrow'>STREAK</p><h3 data-streak-count>0 days</h3><p class='utility-streak-note' data-streak-note>Check in daily to build your streak.</p><button type='button' class='control-button icon-only-button' title='Check in today' aria-label='Check in today' data-streak-checkin>\uD83D\uDD25</button>";
    const streakCount = streakSection.querySelector("[data-streak-count]");
    const streakNote = streakSection.querySelector("[data-streak-note]");
    const streakCheckIn = streakSection.querySelector("[data-streak-checkin]");

    const renderStreak = () => {
        const today = todayStamp();

        streakCount.textContent = `${Math.max(0, Number(streak.count) || 0)} day${streak.count === 1 ? "" : "s"}`;

        if (streak.lastDate === today) {
            streakNote.textContent = "Checked in today.";
            streakCheckIn.disabled = true;
            return;
        }

        if (streak.lastDate === previousDayStamp())
            streakNote.textContent = "Keep the streak alive today.";
        else
            streakNote.textContent = "Start a fresh streak today.";

        streakCheckIn.disabled = false;
    };

    streakCheckIn.onclick = () => {
        const today = todayStamp();
        const yesterday = previousDayStamp();

        if (streak.lastDate === today)
            return;

        if (streak.lastDate === yesterday)
            streak.count = Math.max(0, Number(streak.count) || 0) + 1;
        else
            streak.count = 1;

        streak.lastDate = today;
        saveJson(STREAK_KEY, streak);
        renderStreak();
    };

    renderStreak();
    nodes.streak = streakSection;
    nodes.streak.dataset.widgetId = "streak";

    const notesSection = document.createElement("section");
    notesSection.className = "utility-card card glass module module-utility";
    notesSection.innerHTML = "<p class='eyebrow'>NOTES</p><textarea class='utility-notes' maxlength='400' placeholder='Quick notes for your desk'></textarea>";
    const notesArea = notesSection.querySelector("textarea");
    notesArea.value = notes;
    notesArea.oninput = () => {
        notes = notesArea.value;
        saveJson(NOTES_KEY, notes);
    };
    nodes.notes = notesSection;
    nodes.notes.dataset.widgetId = "notes";

    const applyFreePosition = (id, node, index) => {
        const position = freePositions[id] || {
            x: index % 2 === 0 ? 2 : 51,
            y: Math.floor(index / 2) * 168 + 8
        };

        const x = Math.max(0, Math.min(74, Number(position.x) || 0));
        const y = Math.max(0, Number(position.y) || 0);

        node.style.left = `${x}%`;
        node.style.top = `${y}px`;
    };

    const refreshFreeHeight = () => {
        if (!freeLayout) {
            widgetHost.style.minHeight = "";
            return;
        }

        let maxBottom = 0;

        layout.forEach(item => {
            const node = nodes[item.id];

            if (!node || node.style.display === "none")
                return;

            const top = Number.parseFloat(node.style.top || "0") || 0;
            const bottom = top + node.offsetHeight;

            if (bottom > maxBottom)
                maxBottom = bottom;
        });

        widgetHost.style.minHeight = `${Math.max(420, Math.round(maxBottom + 24))}px`;
    };

    const ensureFreeHandles = () => {
        layout.forEach((item, index) => {
            const node = nodes[item.id];

            if (!node)
                return;

            let handle = node.querySelector(".free-widget-handle");

            if (!handle) {
                handle = document.createElement("button");
                handle.type = "button";
                handle.className = "free-widget-handle";
                handle.textContent = "\u22EE";
                handle.title = "Move widget";
                handle.setAttribute("aria-label", "Move widget");
                node.appendChild(handle);

                handle.addEventListener("pointerdown", event => {
                    if (!freeLayout)
                        return;

                    event.preventDefault();

                    const id = node.dataset.widgetId;
                    const rect = node.getBoundingClientRect();
                    const hostRect = widgetHost.getBoundingClientRect();

                    dragState.id = id;
                    dragState.pointerId = event.pointerId;
                    dragState.offsetX = event.clientX - rect.left;
                    dragState.offsetY = event.clientY - rect.top;

                    node.classList.add("is-moving");
                    handle.setPointerCapture(event.pointerId);
                    node.style.zIndex = "12";
                    applyFreePosition(id, node, index);
                });

                handle.addEventListener("pointermove", event => {
                    if (!freeLayout)
                        return;

                    if (dragState.id !== node.dataset.widgetId || dragState.pointerId !== event.pointerId)
                        return;

                    const hostRect = widgetHost.getBoundingClientRect();
                    const nodeRect = node.getBoundingClientRect();
                    const maxX = Math.max(0, hostRect.width - nodeRect.width);
                    const maxY = Math.max(0, hostRect.height - nodeRect.height + 220);
                    const leftPx = Math.max(0, Math.min(maxX, event.clientX - hostRect.left - dragState.offsetX));
                    const topPx = Math.max(0, Math.min(maxY, event.clientY - hostRect.top - dragState.offsetY));
                    const leftPercent = hostRect.width ? (leftPx / hostRect.width) * 100 : 0;

                    node.style.left = `${Math.max(0, Math.min(74, leftPercent))}%`;
                    node.style.top = `${topPx}px`;
                    refreshFreeHeight();
                });

                const endDrag = event => {
                    if (dragState.id !== node.dataset.widgetId || dragState.pointerId !== event.pointerId)
                        return;

                    node.classList.remove("is-moving");
                    node.style.zIndex = "";

                    if (handle.hasPointerCapture(event.pointerId))
                        handle.releasePointerCapture(event.pointerId);

                    freePositions[node.dataset.widgetId] = {
                        x: Number.parseFloat(node.style.left || "0") || 0,
                        y: Number.parseFloat(node.style.top || "0") || 0
                    };
                    saveFreePositions(freePositions);
                    dragState.id = "";
                    dragState.pointerId = 0;
                    refreshFreeHeight();
                };

                handle.addEventListener("pointerup", endDrag);
                handle.addEventListener("pointercancel", endDrag);
            }

            handle.style.display = freeLayout ? "" : "none";
        });
    };

    const applyLayout = () => {
        widgetHost.classList.toggle("is-free-layout", freeLayout);

        layout.forEach(item => {
            const node = nodes[item.id];

            if (!node)
                return;

            widgetHost.appendChild(node);
            node.style.display = item.visible ? "" : "none";

            if (!freeLayout) {
                node.style.position = "";
                node.style.left = "";
                node.style.top = "";
                node.style.width = "";
                node.style.zIndex = "";
            }
        });

        if (freeLayout) {
            layout.forEach((item, index) => {
                const node = nodes[item.id];

                if (!node || node.style.display === "none")
                    return;

                node.style.position = "absolute";
                node.style.width = "47%";
                applyFreePosition(item.id, node, index);
            });
        }

        ensureFreeHandles();
        window.requestAnimationFrame(refreshFreeHeight);
    };

    const openLayoutEditor = () => {
        const children = [sheetTitle("CUSTOMIZE HOME")];
        const list = document.createElement("div");
        let touchDragFrom = -1;
        let touchDragTarget = -1;

        list.className = "widget-editor-list";

        const setDropTarget = index => {
            list.querySelectorAll(".widget-editor-row").forEach(row => {
                row.classList.toggle("is-drop-target", Number(row.dataset.index) === index);
            });
        };

        const commitMove = (fromIndex, toIndex) => {
            if (!moveLayoutItem(layout, fromIndex, toIndex))
                return;

            saveLayout(layout);
            applyLayout();
            openLayoutEditor();
        };

        layout.forEach((item, index) => {
            const row = document.createElement("div");
            row.className = "widget-editor-row";
            row.dataset.index = String(index);
            row.draggable = true;

            const handle = document.createElement("button");
            handle.type = "button";
            handle.className = "widget-editor-handle";
            handle.textContent = "\u2630";
            handle.title = `Reorder ${item.label}`;
            handle.setAttribute("aria-label", `Drag ${item.label}`);

            const name = document.createElement("span");
            name.className = "widget-editor-name";
            name.textContent = item.label;

            const toggle = document.createElement("button");
            toggle.type = "button";
            toggle.className = "sheet-secondary";
            toggle.textContent = item.visible ? "\uD83D\uDC41" : "\uD83D\uDEAB";
            toggle.title = item.visible ? "Hide widget" : "Show widget";
            toggle.setAttribute("aria-label", item.visible ? "Hide widget" : "Show widget");
            toggle.onclick = () => {
                item.visible = !item.visible;
                saveLayout(layout);
                applyLayout();
                openLayoutEditor();
            };

            row.addEventListener("dragstart", event => {
                row.classList.add("is-dragging");
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", String(index));
            });

            row.addEventListener("dragover", event => {
                event.preventDefault();
                setDropTarget(index);
            });

            row.addEventListener("dragleave", () => {
                row.classList.remove("is-drop-target");
            });

            row.addEventListener("drop", event => {
                event.preventDefault();
                const fromIndex = Number(event.dataTransfer.getData("text/plain"));

                setDropTarget(-1);
                commitMove(fromIndex, index);
            });

            row.addEventListener("dragend", () => {
                row.classList.remove("is-dragging");
                setDropTarget(-1);
            });

            handle.addEventListener("pointerdown", event => {
                if (event.pointerType === "mouse")
                    return;

                touchDragFrom = index;
                touchDragTarget = index;
                row.classList.add("is-dragging");
                handle.setPointerCapture(event.pointerId);
            });

            handle.addEventListener("pointermove", event => {
                if (touchDragFrom !== index)
                    return;

                const hit = document.elementFromPoint(event.clientX, event.clientY);
                const dropRow = hit && hit.closest(".widget-editor-row");

                if (!dropRow)
                    return;

                touchDragTarget = Number(dropRow.dataset.index);
                setDropTarget(touchDragTarget);
            });

            handle.addEventListener("pointerup", event => {
                if (touchDragFrom !== index)
                    return;

                row.classList.remove("is-dragging");
                setDropTarget(-1);
                handle.releasePointerCapture(event.pointerId);
                commitMove(touchDragFrom, touchDragTarget);
                touchDragFrom = -1;
                touchDragTarget = -1;
            });

            handle.addEventListener("pointercancel", event => {
                if (touchDragFrom !== index)
                    return;

                row.classList.remove("is-dragging");
                setDropTarget(-1);
                handle.releasePointerCapture(event.pointerId);
                touchDragFrom = -1;
                touchDragTarget = -1;
            });
            row.appendChild(handle);
            row.appendChild(name);
            row.appendChild(toggle);
            list.appendChild(row);
        });

        const doneRow = document.createElement("div");
        doneRow.className = "sheet-row";
        doneRow.style.marginTop = "12px";

        const reset = document.createElement("button");
        reset.type = "button";
        reset.className = "sheet-secondary";
        reset.textContent = "\u21BA";
        reset.title = "Reset widget order and visibility";
        reset.setAttribute("aria-label", "Reset widget order and visibility");
        reset.onclick = () => {
            layout = DEFAULT_LAYOUT.map(item => ({ ...item }));
            saveLayout(layout);
            applyLayout();
            openLayoutEditor();
        };

        const freeMode = document.createElement("button");
        freeMode.type = "button";
        freeMode.className = "sheet-secondary";
        freeMode.textContent = freeLayout ? "\u25C9" : "\u25EF";
        freeMode.title = freeLayout ? "Disable free drag mode" : "Enable free drag mode";
        freeMode.setAttribute("aria-label", freeLayout ? "Disable free drag mode" : "Enable free drag mode");
        freeMode.onclick = () => {
            freeLayout = !freeLayout;
            saveFreeLayout(freeLayout);
            applyLayout();
            openLayoutEditor();
        };

        const resetFree = document.createElement("button");
        resetFree.type = "button";
        resetFree.className = "sheet-secondary";
        resetFree.textContent = "\u2316";
        resetFree.title = "Reset free-drag positions";
        resetFree.setAttribute("aria-label", "Reset free-drag positions");
        resetFree.onclick = () => {
            freePositions = {};
            saveFreePositions(freePositions);
            applyLayout();
            openLayoutEditor();
        };

        const done = document.createElement("button");
        done.type = "button";
        done.className = "sheet-primary";
        done.textContent = "\u2713";
        done.title = "Close customization";
        done.setAttribute("aria-label", "Close customization");
        done.onclick = closeSheet;

        doneRow.appendChild(reset);
        doneRow.appendChild(freeMode);
        doneRow.appendChild(resetFree);
        doneRow.appendChild(done);

        children.push(list);
        children.push(doneRow);
        showSheet(children);
    };

    const openHomeSettings = () => {
        const children = [sheetTitle("HOME SETTINGS")];

        const layoutTitle = sheetTitle("LAYOUT");
        layoutTitle.style.marginTop = "14px";

        const layoutRow = document.createElement("div");
        layoutRow.className = "sheet-row";

        const customizeButton = document.createElement("button");
        customizeButton.type = "button";
        customizeButton.className = "sheet-primary";
        customizeButton.textContent = "Customize Widgets";
        customizeButton.onclick = openLayoutEditor;
        layoutRow.appendChild(customizeButton);

        const lookTitle = sheetTitle("LOOK");
        lookTitle.style.marginTop = "14px";

        const accentLabel = document.createElement("p");
        accentLabel.className = "home-look-label";
        accentLabel.textContent = "Accent";

        const themeChips = document.createElement("div");
        themeChips.className = "home-look-chips";

        renderLookChips(themeChips);

        const profileTitle = sheetTitle("PROFILE");
        profileTitle.style.marginTop = "14px";

        const profileRow = document.createElement("div");
        profileRow.className = "sheet-row";

        const exportButton = document.createElement("button");
        exportButton.type = "button";
        exportButton.className = "sheet-secondary";
        exportButton.textContent = "Export JSON";
        exportButton.onclick = () => exportProfile(exportButton);

        const importButton = document.createElement("button");
        importButton.type = "button";
        importButton.className = "sheet-secondary";
        importButton.textContent = "Import JSON";
        importButton.onclick = () => importProfile(importButton);

        profileRow.appendChild(exportButton);
        profileRow.appendChild(importButton);

        const privacyTitle = sheetTitle("PRIVACY & CONTEXT");
        privacyTitle.style.marginTop = "14px";

        const privacy = document.createElement("div");
        privacy.className = "activity-settings";
        privacy.innerHTML = "<p class='activity-settings-note'>ArcDeck stores action names and outcomes locally. It never records typed text, URLs, window titles, clipboard data, or screen content.</p>" +
            "<div class='activity-settings-row'><span>Activity history</span><button type='button' class='sheet-secondary' data-history>Loading</button></div>" +
            "<div class='activity-settings-row'><span>Suggestions</span><button type='button' class='sheet-secondary' data-suggestions>Loading</button></div>" +
            "<div class='activity-settings-row'><span>Retention</span><button type='button' class='sheet-secondary' data-retention>30 days</button></div>" +
            "<div class='sheet-row activity-data-actions'><button type='button' class='sheet-secondary' data-activity-export>Export</button><button type='button' class='sheet-secondary' data-activity-clear>Clear history</button></div>";

        let activitySettings = null;
        const historyButton = privacy.querySelector("[data-history]");
        const suggestionsButton = privacy.querySelector("[data-suggestions]");
        const retentionButton = privacy.querySelector("[data-retention]");

        const paintActivitySettings = () => {
            if (!activitySettings)
                return;
            historyButton.textContent = activitySettings.history_enabled ? "On" : "Off";
            suggestionsButton.textContent = activitySettings.suggestions_enabled ? "On" : "Off";
            retentionButton.textContent = `${activitySettings.retention_days} days`;
        };

        loadActivitySettings().then(settings => {
            if (settings && !settings.error) {
                activitySettings = settings;
                paintActivitySettings();
            }
        });

        historyButton.onclick = () => {
            if (!activitySettings)
                return;
            saveActivitySettings({ history_enabled: !activitySettings.history_enabled }).then(settings => {
                if (settings && !settings.error) {
                    activitySettings = settings;
                    paintActivitySettings();
                }
            });
        };

        suggestionsButton.onclick = () => {
            if (!activitySettings)
                return;
            saveActivitySettings({ suggestions_enabled: !activitySettings.suggestions_enabled }).then(settings => {
                if (settings && !settings.error) {
                    activitySettings = settings;
                    paintActivitySettings();
                }
            });
        };

        retentionButton.onclick = () => {
            if (!activitySettings)
                return;
            const values = [7, 30, 90];
            const current = values.indexOf(activitySettings.retention_days);
            const next = values[(current + 1) % values.length];
            saveActivitySettings({ retention_days: next }).then(settings => {
                if (settings && !settings.error) {
                    activitySettings = settings;
                    paintActivitySettings();
                }
            });
        };

        privacy.querySelector("[data-activity-export]").onclick = () => {
            loadActivityEvents(1000).then(async data => {
                const payload = JSON.stringify(data && data.events ? data.events : [], null, 2);
                try {
                    await navigator.clipboard.writeText(payload);
                    window.alert("Activity history copied.");
                } catch (error) {
                    window.prompt("Copy your ArcDeck activity history", payload);
                }
            });
        };

        privacy.querySelector("[data-activity-clear]").onclick = () => {
            if (!window.confirm("Clear all locally stored ArcDeck activity history?"))
                return;
            clearActivityEvents().then(() => window.alert("Activity history cleared."));
        };

        children.push(layoutTitle);
        children.push(layoutRow);
        children.push(lookTitle);
        children.push(accentLabel);
        children.push(themeChips);
        children.push(profileTitle);
        children.push(profileRow);
        children.push(privacyTitle);
        children.push(privacy);
        showSheet(children);
    };

    settingsBar.querySelector("[data-home-settings]").onclick = openHomeSettings;
    applyLayout();

    const byName = names => {
        const wanted = names.map(name => String(name || "").toLowerCase());

        return wanted.map(name => {
            return state.apps.find(app => String(app.name || "").toLowerCase() === name);
        }).filter(Boolean);
    };

    const fillQuickGrid = (grid, apps, emptyLabel, emptyIcon) => {
        grid.innerHTML = "";

        if (!apps.length) {
            const empty = document.createElement("div");
            empty.className = "quick-apps-empty";
            empty.innerHTML = "<span class='quick-empty-icon'>" + iconMarkup(emptyIcon, { size: 20 }) + "</span><span><strong>Nothing here yet</strong><small>" + emptyLabel + "</small></span>";
            grid.appendChild(empty);
            return;
        }

        apps.forEach(app => {
            const card = LauncherCard(app);
            card.classList.add("quick-app-card");
            grid.appendChild(card);
        });
    };

    const renderQuickApps = () => {
        if (!page.parentNode)
            return;

        fillQuickGrid(
            favoritesGrid,
            byName(getFavoriteNames()).slice(0, 6),
            "Favorite apps appear here.",
            "star"
        );
        fillQuickGrid(
            recentsGrid,
            byName(getRecentNames()).slice(0, 6),
            "Launch an app to build recents.",
            "clock"
        );
    };

    function update(data) {
        if (!page.parentNode) {
            off("system:update", update);
            off("apps:running", renderQuickApps);
            off("apps:favorites", renderQuickApps);
            off("apps:recents", renderQuickApps);
            return;
        }

        const cpuEl = document.getElementById("cpu");
        const ramEl = document.getElementById("ram");
        const diskEl = document.getElementById("disk");
        if (cpuEl) cpuEl.textContent = `${data.cpu}%`;
        if (ramEl) ramEl.textContent = `${data.ram}%`;
        if (diskEl && data.disk !== undefined) diskEl.textContent = `${data.disk}%`;
        paintStatGauge("cpu", data.cpu);
        paintStatGauge("ram", data.ram);
        if (data.disk !== undefined) paintStatGauge("disk", data.disk);
    }

    on("system:update", update);
    on("apps:running", renderQuickApps);
    on("apps:favorites", renderQuickApps);
    on("apps:recents", renderQuickApps);

    loadApps().then(renderQuickApps);

    return page;
}
