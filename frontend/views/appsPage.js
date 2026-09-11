import mountChrome from "../js/chrome.js";
import AppSearch from "../components/appSearch.js";
import AppTile from "../components/appTile.js";
import PageIntro from "../components/pageIntro.js";
import { openGameEditor } from "../components/appSheet.js";
import { catalogForApps, catalogCategories } from "../js/appCatalog.js";
import { loadApps } from "../js/apps.js";
import { off, on } from "../js/events.js";

export default function AppsPage() {
    const page = document.createElement("div");
    page.className = "apps page ios-modular-page";

    mountChrome();

    const header = PageIntro({ eyebrow: "DESKTOP LIBRARY", title: "Your apps", icon: "apps", meta: "Launch / manage" });

    const chipRow = document.createElement("div");
    chipRow.className = "filter-chip-row";

    const modules = document.createElement("div");
    modules.className = "module-grid module-grid-apps";

    let catalog = [];
    let filter = "all";
    const library = document.createElement("div");
    library.className = "arc-app-library";

    const addGame = document.createElement("button");
    addGame.type = "button";
    addGame.className = "filter-chip game-management-button";
    addGame.textContent = "Add game";
    addGame.onclick = () => openGameEditor();
    chipRow.appendChild(addGame);

    const renderFilters = () => {
        chipRow.querySelectorAll(".library-filter").forEach(button => button.remove());
        const filters = ["all", ...catalogCategories(catalog)];
        filters.forEach(category => {
        const chip = document.createElement("button");

        chip.type = "button";
        chip.className = "filter-chip library-filter";
        chip.textContent = category === "all" ? "All apps" : category;
        chip.classList.toggle("active", category === filter);
        chip.onclick = () => {
            filter = category;
            chipRow.querySelectorAll(".library-filter").forEach(other => other.classList.remove("active"));
            chip.classList.add("active");
            renderLibrary();
        };

        chipRow.appendChild(chip);
        });
    };

    const renderLibrary = () => {
        library.innerHTML = "";
        const groups = {};
        catalog.filter(entry => filter === "all" || entry.category === filter).forEach(entry => {
            if (!groups[entry.category])
                groups[entry.category] = [];
            groups[entry.category].push(entry);
        });
        Object.keys(groups).forEach(category => {
            const section = document.createElement("section");
            section.className = "arc-library-category";
            section.innerHTML = `<div class="module-heading"><div><p class="eyebrow">ARC LIBRARY</p><h2>${category}</h2></div><span class="section-index">${String(Object.keys(groups).indexOf(category) + 1).padStart(2, "0")}</span></div>`;
            const grid = document.createElement("div");
            grid.className = "arc-library-grid";
            groups[category].forEach(entry => grid.appendChild(AppTile(entry)));
            section.appendChild(grid);
            library.appendChild(section);
        });
    };

    page.appendChild(header);
    page.appendChild(chipRow);
    modules.appendChild(AppSearch());
    modules.appendChild(library);
    page.appendChild(modules);

    const repaint = apps => {
        if (!page.parentNode) {
            off("apps:running", repaint);
            return;
        }
        if (Array.isArray(apps)) {
            catalog = catalogForApps(apps);
            renderFilters();
            renderLibrary();
        }
    };
    on("apps:running", repaint);
    loadApps().then(apps => {
        catalog = catalogForApps(apps);
        renderFilters();
        renderLibrary();
    });

    return page;
}
