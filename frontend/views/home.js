import mountChrome from "../js/chrome.js";
import router from "../js/router.js";
import HeroCard from "../components/heroCard.js";
import GlassCard from "../components/glassCard.js";
import FocusCard from "../components/focusCard.js";
import RunningStrip from "../components/runningStrip.js";
import SceneStrip from "../components/sceneStrip.js";
import VolumeControl from "../components/volumeControl.js";
import LauncherCard from "../components/launcherCard.js";
import { closeSheet, sheetTitle, showSheet } from "../components/sheet.js";
import { THEMES, UI_STYLES, applyTheme, applyUiStyle, currentTheme, currentUiStyle } from "../js/theme.js";
import { loadMedia, mediaAction } from "../js/media.js";

import { off, on } from "../js/events.js";
import { getFavoriteNames, getRecentNames, loadApps } from "../js/apps.js";
import state from "../js/state.js";

const LAYOUT_KEY = "arcdeck.homeLayout";
const FREE_LAYOUT_KEY = "arcdeck.homeFreeLayout";
const FREE_POSITIONS_KEY = "arcdeck.homeFreePositions";
const CHECKLIST_KEY = "arcdeck.utilChecklist";
const NOTES_KEY = "arcdeck.utilNotes";
const STREAK_KEY = "arcdeck.utilStreak";
const PROFILE_KEYS = [
    "arcdeck.theme",
    "arcdeck.uiStyle",
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
    { id: "stats", label: "Stats", visible: true },
    { id: "favorites", label: "Favorites", visible: true },
    { id: "recents", label: "Recents", visible: true },
    { id: "focus", label: "In Focus", visible: true },
    { id: "scenes", label: "Scenes", visible: true },
    { id: "running", label: "Running Apps", visible: true },
    { id: "volume", label: "Volume", visible: true },
    { id: "checklist", label: "Checklist", visible: true },
    { id: "streak", label: "Streak", visible: true },
    { id: "shortcuts", label: "Shortcuts", visible: true },
    { id: "miniMedia", label: "Mini Media", visible: true },
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
    page.className = "home page";

    let layout = loadLayout();
    let freeLayout = loadFreeLayout();
    let freePositions = loadFreePositions();
    let checklist = loadJson(CHECKLIST_KEY, []);
    let notes = String(loadJson(NOTES_KEY, "") || "");
    let streak = loadJson(STREAK_KEY, { count: 0, lastDate: "" });
    let mediaState = { title: "No media detected", artist: "", playing: false };

    const nodes = {};
    const dragState = { id: "", pointerId: 0, offsetX: 0, offsetY: 0 };

    mountChrome();

    const customize = document.createElement("section");
    customize.className = "home-customize card glass";
    customize.innerHTML = "<p class='eyebrow'>LAYOUT</p><div class='home-customize-row'><span>Customize visible widgets and order.</span><button type='button' class='control-button icon-only-button' title='Customize home layout' aria-label='Customize home layout' data-customize>\u2699</button></div><p class='eyebrow home-look-title'>LOOK</p><div class='home-look-block'><p class='home-look-label'>Accent</p><div class='home-look-chips' data-theme-chips></div></div><div class='home-look-block'><p class='home-look-label'>Style</p><div class='home-look-chips' data-style-chips></div></div><p class='eyebrow home-look-title'>PROFILE</p><div class='home-customize-row'><span>Share your setup as JSON.</span><button type='button' class='control-button icon-only-button' title='Export profile JSON' aria-label='Export profile JSON' data-export-profile>\u2B06</button><button type='button' class='control-button icon-only-button' title='Import profile JSON' aria-label='Import profile JSON' data-import-profile>\u2B07</button></div>";
    page.appendChild(customize);

    const themeChips = customize.querySelector("[data-theme-chips]");
    const styleChips = customize.querySelector("[data-style-chips]");
    const exportProfileButton = customize.querySelector("[data-export-profile]");
    const importProfileButton = customize.querySelector("[data-import-profile]");

    const renderLookChips = () => {
        themeChips.innerHTML = "";
        styleChips.innerHTML = "";

        THEMES.forEach(theme => {
            const button = document.createElement("button");
            const dot = document.createElement("span");

            button.type = "button";
            button.className = "home-look-chip";
            button.classList.toggle("active", currentTheme() === theme.id);
            button.textContent = theme.label;
            button.onclick = () => {
                applyTheme(theme.id);
                renderLookChips();
            };

            dot.className = "home-look-dot";
            dot.style.color = theme.swatch;
            dot.textContent = "\u25CF";
            button.insertBefore(dot, button.firstChild);
            themeChips.appendChild(button);
        });

        UI_STYLES.forEach(style => {
            const button = document.createElement("button");

            button.type = "button";
            button.className = "home-look-chip";
            button.classList.toggle("active", currentUiStyle() === style.id);
            button.textContent = style.label;
            button.onclick = () => {
                applyUiStyle(style.id);
                renderLookChips();
            };

            styleChips.appendChild(button);
        });
    };

    renderLookChips();

    const widgetHost = document.createElement("div");
    widgetHost.className = "home-widget-host";
    page.appendChild(widgetHost);

    exportProfileButton.onclick = async () => {
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
                exportProfileButton.textContent = "\u2713";
                window.setTimeout(() => {
                    exportProfileButton.textContent = "\u2B06";
                }, 900);
                return;
            } catch (error) {
                // Fallback to prompt if clipboard permission is denied.
            }
        }

        window.prompt("Copy your Arc-Deck profile JSON", payload);
    };

    importProfileButton.onclick = () => {
        const raw = window.prompt("Paste Arc-Deck profile JSON");

        if (!raw)
            return;

        try {
            const parsed = JSON.parse(raw);
            const settings = parsed && parsed.settings;

            if (!settings || typeof settings !== "object") {
                importProfileButton.textContent = "!";
                window.setTimeout(() => {
                    importProfileButton.textContent = "\u2B07";
                }, 900);
                return;
            }

            PROFILE_KEYS.forEach(key => {
                if (typeof settings[key] === "string")
                    localStorage.setItem(key, settings[key]);
            });

            applyTheme(localStorage.getItem("arcdeck.theme"));
            applyUiStyle(localStorage.getItem("arcdeck.uiStyle"));
            window.location.reload();
        } catch (error) {
            importProfileButton.textContent = "!";
            window.setTimeout(() => {
                importProfileButton.textContent = "\u2B07";
            }, 900);
        }
    };

    nodes.hero = HeroCard();
    nodes.hero.dataset.widgetId = "hero";

    // small summary widgets
    const widgets = document.createElement("div");
    widgets.className = "widgets";
    const cpu = GlassCard({ title: "CPU", content: "<h2 id='cpu'>0%</h2>" });
    const ram = GlassCard({ title: "RAM", content: "<h2 id='ram'>0%</h2>" });
    const disk = GlassCard({ title: "Disk", content: "<h2 id='disk'>0%</h2>" });
    widgets.append(cpu, ram, disk);
    nodes.stats = widgets;
    nodes.stats.dataset.widgetId = "stats";

    const favoritesSection = document.createElement("section");
    favoritesSection.className = "quick-apps card glass";
    favoritesSection.innerHTML = "<p class='eyebrow'>FAVORITES</p>";
    const favoritesGrid = document.createElement("div");
    favoritesGrid.className = "quick-apps-grid";
    favoritesSection.appendChild(favoritesGrid);
    nodes.favorites = favoritesSection;
    nodes.favorites.dataset.widgetId = "favorites";

    const recentsSection = document.createElement("section");
    recentsSection.className = "quick-apps card glass";
    recentsSection.innerHTML = "<p class='eyebrow'>RECENT APPS</p>";
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
    checklistSection.className = "utility-card card glass";
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
            done.className = "utility-small-button";
            done.textContent = item.done ? "\u2611" : "\u2610";
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
            remove.textContent = "\u2715";
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
    streakSection.className = "utility-card card glass";
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

    const shortcutsSection = document.createElement("section");
    shortcutsSection.className = "utility-card card glass";
    shortcutsSection.innerHTML = "<p class='eyebrow'>SHORTCUTS</p><div class='utility-shortcuts' data-shortcuts></div>";
    const shortcutsGrid = shortcutsSection.querySelector("[data-shortcuts]");
    [
        { icon: "\u25A6", label: "Apps", page: "apps" },
        { icon: "\u266A", label: "Media", page: "media" },
        { icon: "\u25CE", label: "Control", page: "control" },
        { icon: "\u25A3", label: "Screen", page: "screen" },
        { icon: "\u25F7", label: "Clock", page: "clock" },
        { icon: "\u26A1", label: "Scenes", page: "scenes" }
    ].forEach(shortcut => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "utility-shortcut";
        button.title = shortcut.label;
        button.setAttribute("aria-label", shortcut.label);
        button.innerHTML = `<span class='utility-shortcut-icon'>${shortcut.icon}</span><span class='utility-shortcut-label'>${shortcut.label}</span>`;
        button.onclick = () => {
            router.navigate(shortcut.page);
        };

        shortcutsGrid.appendChild(button);
    });
    nodes.shortcuts = shortcutsSection;
    nodes.shortcuts.dataset.widgetId = "shortcuts";

    const miniMediaSection = document.createElement("section");
    miniMediaSection.className = "utility-card card glass";
    miniMediaSection.innerHTML = "<p class='eyebrow'>MINI MEDIA</p><h3 data-mini-media-title>No media detected</h3><p class='utility-media-artist' data-mini-media-artist> </p><div class='utility-media-controls'><button type='button' class='control-button icon-only-button' title='Previous track' aria-label='Previous track' data-media-prev>\u23EE</button><button type='button' class='control-button icon-only-button' title='Play or pause' aria-label='Play or pause' data-media-play>\u23EF</button><button type='button' class='control-button icon-only-button' title='Next track' aria-label='Next track' data-media-next>\u23ED</button><button type='button' class='control-button icon-only-button' title='Mute audio' aria-label='Mute audio' data-media-mute>\uD83D\uDD07</button></div>";
    const miniMediaTitle = miniMediaSection.querySelector("[data-mini-media-title]");
    const miniMediaArtist = miniMediaSection.querySelector("[data-mini-media-artist]");
    const renderMedia = () => {
        miniMediaTitle.textContent = mediaState.title || "No media detected";
        miniMediaArtist.textContent = mediaState.artist || (mediaState.playing ? "Playing" : "Idle");
    };

    const handleMediaUpdate = data => {
        if (!data || data.error)
            return;

        mediaState = {
            title: data.title || "No media detected",
            artist: data.artist || "",
            playing: Boolean(data.playing)
        };
        renderMedia();
    };

    miniMediaSection.querySelector("[data-media-prev]").onclick = () => mediaAction("previous");
    miniMediaSection.querySelector("[data-media-play]").onclick = () => mediaAction("play");
    miniMediaSection.querySelector("[data-media-next]").onclick = () => mediaAction("next");
    miniMediaSection.querySelector("[data-media-mute]").onclick = () => mediaAction("mute");

    on("media:update", handleMediaUpdate);
    renderMedia();
    loadMedia();
    nodes.miniMedia = miniMediaSection;
    nodes.miniMedia.dataset.widgetId = "miniMedia";

    const notesSection = document.createElement("section");
    notesSection.className = "utility-card card glass";
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

    customize.querySelector("[data-customize]").onclick = openLayoutEditor;
    applyLayout();

    const byName = names => {
        const wanted = names.map(name => String(name || "").toLowerCase());

        return wanted.map(name => {
            return state.apps.find(app => String(app.name || "").toLowerCase() === name);
        }).filter(Boolean);
    };

    const fillQuickGrid = (grid, apps, emptyLabel) => {
        grid.innerHTML = "";

        if (!apps.length) {
            const empty = document.createElement("p");
            empty.className = "quick-apps-empty";
            empty.textContent = emptyLabel;
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
            "Favorite apps appear here."
        );
        fillQuickGrid(
            recentsGrid,
            byName(getRecentNames()).slice(0, 6),
            "Launch an app to build recents."
        );
    };

    function update(data) {
        if (!page.parentNode) {
            off("system:update", update);
            off("apps:running", renderQuickApps);
            off("apps:favorites", renderQuickApps);
            off("apps:recents", renderQuickApps);
            off("media:update", handleMediaUpdate);
            return;
        }

        const cpuEl = document.getElementById("cpu");
        const ramEl = document.getElementById("ram");
        const diskEl = document.getElementById("disk");
        if (cpuEl) cpuEl.textContent = `${data.cpu}%`;
        if (ramEl) ramEl.textContent = `${data.ram}%`;
        if (diskEl && data.disk !== undefined) diskEl.textContent = `${data.disk}%`;
    }

    on("system:update", update);
    on("apps:running", renderQuickApps);
    on("apps:favorites", renderQuickApps);
    on("apps:recents", renderQuickApps);

    loadApps().then(renderQuickApps);

    return page;
}
