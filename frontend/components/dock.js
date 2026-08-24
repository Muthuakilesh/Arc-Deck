import router from "../js/router.js";
import { THEMES, UI_STYLES, applyTheme, applyUiStyle, currentTheme, currentUiStyle } from "../js/theme.js";
import { closeSheet, sheetIsOpen, sheetTitle, showSheet } from "./sheet.js";

// Seven equal buttons on a 320px screen is 45px each with no room for labels,
// so the dock keeps the five pages reached most often and the rest move into
// a sheet behind "More".
const PRIMARY = [
    { icon: "\u2302", page: "home", label: "Home" },
    { icon: "\u25A6", page: "apps", label: "Apps" },
    { icon: "\u266A", page: "media", label: "Media" },
    { icon: "\u25CE", page: "control", label: "Control" }
];

const OVERFLOW = [
    { icon: "\u26A1", page: "scenes", label: "Scenes" },
    { icon: "\u2726", page: "games", label: "Games" },
    { icon: "\u25D8", page: "gamepad", label: "Gamepad" },
    { icon: "\u25A3", page: "screen", label: "Screen" },
    { icon: "\u2637", page: "stats", label: "Stats" },
    { icon: "\u25F7", page: "clock", label: "Clock" }
];

const HOLD_MS = 450;

function hint(button) {
    let timer = 0;
    let startX = 0;
    let startY = 0;

    const stop = () => {
        if (timer) {
            window.clearTimeout(timer);
            timer = 0;
        }
    };

    const show = () => {
        button.classList.add("show-tip");
        button.dataset.skipClick = "1";

        window.setTimeout(() => {
            button.classList.remove("show-tip");
        }, 900);
    };

    button.addEventListener("touchstart", event => {
        if (!event.touches || event.touches.length !== 1)
            return;

        const touch = event.touches[0];

        startX = touch.clientX;
        startY = touch.clientY;
        stop();
        timer = window.setTimeout(show, HOLD_MS);
    }, { passive: true });

    button.addEventListener("touchmove", event => {
        if (!timer || !event.touches || !event.touches.length)
            return;

        const touch = event.touches[0];

        if (Math.abs(touch.clientX - startX) > 10 || Math.abs(touch.clientY - startY) > 10)
            stop();
    }, { passive: true });

    ["touchend", "touchcancel", "mousedown", "mouseup", "mouseleave"].forEach(name => {
        button.addEventListener(name, stop, { passive: true });
    });

    button.addEventListener("click", event => {
        if (button.dataset.skipClick !== "1")
            return;

        event.preventDefault();
        event.stopImmediatePropagation();
        button.dataset.skipClick = "0";
    }, true);
}


function item(entry, className) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = className;
    button.dataset.page = entry.page;
    button.dataset.tip = entry.label;
    button.title = entry.label;

    const icon = document.createElement("span");
    icon.className = "dock-icon";
    icon.textContent = entry.icon;
    icon.setAttribute("aria-hidden", "true");

    const label = document.createElement("span");
    label.className = "dock-label";
    label.textContent = entry.label;

    button.appendChild(icon);
    button.appendChild(label);

    hint(button);

    return button;
}


function openSheet() {
    const title = sheetTitle("MORE");

    const grid = document.createElement("div");
    grid.className = "sheet-grid";

    OVERFLOW.forEach(entry => {
        const button = item(entry, "sheet-item");

        if (router.current === entry.page)
            button.classList.add("active");

        button.onclick = () => {
            closeSheet();
            router.navigate(entry.page);
        };

        grid.appendChild(button);
    });

    const themeTitle = sheetTitle("ACCENT");
    themeTitle.style.marginTop = "14px";

    const themeGrid = document.createElement("div");
    themeGrid.className = "sheet-grid";

    THEMES.forEach(theme => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "sheet-item";
        button.textContent = theme.label;

        if (currentTheme() === theme.id)
            button.classList.add("active");

        const dot = document.createElement("span");
        dot.className = "dock-icon";
        dot.style.color = theme.swatch;
        dot.textContent = "\u25CF";

        button.insertBefore(dot, button.firstChild);

        button.onclick = () => {
            applyTheme(theme.id);
            closeSheet();
            openSheet();
        };

        themeGrid.appendChild(button);
    });

    const styleTitle = sheetTitle("STYLE");
    styleTitle.style.marginTop = "14px";

    const styleGrid = document.createElement("div");
    styleGrid.className = "sheet-grid";

    UI_STYLES.forEach(style => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "sheet-item";
        button.textContent = style.label;

        if (currentUiStyle() === style.id)
            button.classList.add("active");

        const dot = document.createElement("span");
        dot.className = "dock-icon";
        dot.textContent = "\u25F0";

        button.insertBefore(dot, button.firstChild);

        button.onclick = () => {
            applyUiStyle(style.id);
            closeSheet();
            openSheet();
        };

        styleGrid.appendChild(button);
    });

    showSheet([title, grid, themeTitle, themeGrid, styleTitle, styleGrid]);
}


export default function Dock() {
    closeSheet();

    const dock = document.createElement("div");
    dock.className = "glass card dock";

    PRIMARY.forEach(entry => {
        const button = item(entry, "dock-item");

        button.onclick = () => {
            closeSheet();
            router.navigate(entry.page);
        };

        dock.appendChild(button);
    });

    const more = item({ icon: "\u22EF", page: "more", label: "More" }, "dock-item");

    // "More" is active whenever the visible page is one of the ones it holds.
    if (OVERFLOW.some(entry => entry.page === router.current))
        more.classList.add("active");

    more.onclick = () => {
        if (sheetIsOpen())
            closeSheet();
        else
            openSheet();
    };

    dock.appendChild(more);

    return dock;
}
