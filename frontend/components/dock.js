import router from "../js/router.js";
import { THEMES, applyTheme, currentTheme } from "../js/theme.js";

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
    { icon: "\u2726", page: "games", label: "Games" },
    { icon: "\u2637", page: "stats", label: "Stats" },
    { icon: "\u25F7", page: "clock", label: "Clock" }
];


function item(entry, className) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = className;
    button.dataset.page = entry.page;
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

    return button;
}


function closeSheet() {
    const open = document.querySelectorAll(".sheet, .sheet-backdrop");

    for (let index = 0; index < open.length; index += 1)
        open[index].parentNode.removeChild(open[index]);
}


function openSheet() {
    closeSheet();

    const backdrop = document.createElement("div");
    backdrop.className = "sheet-backdrop";
    backdrop.onclick = closeSheet;

    const sheet = document.createElement("div");
    sheet.className = "sheet glass card";

    const title = document.createElement("p");
    title.className = "eyebrow sheet-title";
    title.textContent = "MORE";

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

    const themeTitle = document.createElement("p");
    themeTitle.className = "eyebrow sheet-title";
    themeTitle.style.marginTop = "14px";
    themeTitle.textContent = "ACCENT";

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

    sheet.appendChild(title);
    sheet.appendChild(grid);
    sheet.appendChild(themeTitle);
    sheet.appendChild(themeGrid);

    const root = document.getElementById("arcdeck");
    root.appendChild(backdrop);
    root.appendChild(sheet);
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
        if (document.querySelector(".sheet"))
            closeSheet();
        else
            openSheet();
    };

    dock.appendChild(more);

    return dock;
}
