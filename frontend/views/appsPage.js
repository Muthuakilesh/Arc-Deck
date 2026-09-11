import mountChrome from "../js/chrome.js";
import AppSearch from "../components/appSearch.js";
import LauncherGrid from "../components/launcherGrid.js";
import PageIntro from "../components/pageIntro.js";
import { openGameEditor } from "../components/appSheet.js";

const FILTERS = [
    { id: "all", label: "All" },
    { id: "apps", label: "Apps" },
    { id: "games", label: "Games" }
];

export default function AppsPage() {
    const page = document.createElement("div");
    page.className = "apps page ios-modular-page";

    mountChrome();

    const header = PageIntro({ eyebrow: "DESKTOP LIBRARY", title: "Your apps", icon: "apps", meta: "Launch / manage" });

    const chipRow = document.createElement("div");
    chipRow.className = "filter-chip-row";

    const modules = document.createElement("div");
    modules.className = "module-grid module-grid-apps";

    const grid = LauncherGrid(() => true);

    const addGame = document.createElement("button");
    addGame.type = "button";
    addGame.className = "filter-chip game-management-button";
    addGame.textContent = "Add game";
    addGame.onclick = () => openGameEditor();
    chipRow.appendChild(addGame);

    FILTERS.forEach(filter => {
        const chip = document.createElement("button");

        chip.type = "button";
        chip.className = "filter-chip";
        chip.textContent = filter.label;
        chip.classList.toggle("active", filter.id === "all");
        chip.onclick = () => {
            chipRow.querySelectorAll(".filter-chip").forEach(other => other.classList.remove("active"));
            chip.classList.add("active");
            grid.dataset.filter = filter.id;
        };

        chipRow.appendChild(chip);
    });

    page.appendChild(header);
    page.appendChild(chipRow);
    modules.appendChild(AppSearch());
    modules.appendChild(grid);
    page.appendChild(modules);

    return page;
}
