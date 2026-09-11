import router from "../js/router.js";
import { THEMES, applyTheme, currentTheme } from "../js/theme.js";
import { closeSheet, sheetIsOpen, sheetTitle, showSheet } from "./sheet.js";
import { icon as renderIcon } from "./icon.js";

// Seven equal buttons on a 320px screen is 45px each with no room for labels,
// so the dock keeps the five pages reached most often and the rest move into
// a sheet behind "More".
const PRIMARY = [
    { icon: "home", page: "home", label: "Home" },
    { icon: "apps", page: "apps", label: "Apps" },
    { icon: "media", page: "media", label: "Media" },
    { icon: "control", page: "control", label: "Control" }
];

const OVERFLOW = [
    { icon: "scenes", page: "scenes", label: "Scenes" },
    { icon: "gamepad", page: "gamepad", label: "Gamepad" },
    { icon: "screen", page: "screen", label: "Screen" },
    { icon: "stats", page: "stats", label: "Stats" },
    { icon: "clock", page: "clock", label: "Clock" }
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

    const iconCell = document.createElement("span");
    iconCell.className = "dock-icon";
    iconCell.appendChild(renderIcon(entry.icon, { size: 20 }));

    const label = document.createElement("span");
    label.className = "dock-label";
    label.textContent = entry.label;

    button.appendChild(iconCell);
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
        dot.className = "theme-dot";
        dot.style.background = theme.swatch;

        button.insertBefore(dot, button.firstChild);

        button.onclick = () => {
            applyTheme(theme.id);
            closeSheet();
            openSheet();
        };

        themeGrid.appendChild(button);
    });

    showSheet([title, grid, themeTitle, themeGrid]);
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

    const more = item({ icon: "more", page: "more", label: "More" }, "dock-item");

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
