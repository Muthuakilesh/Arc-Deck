import mountChrome from "../js/chrome.js";
import AppSearch from "../components/appSearch.js";
import LauncherGrid from "../components/launcherGrid.js";


export default function AppsPage() {
    const page = document.createElement("div");
    page.className = "apps page ios-modular-page";

    mountChrome();

    const header = document.createElement("h2");
    header.textContent = "Apps";

    const modules = document.createElement("div");
    modules.className = "module-grid module-grid-apps";

    page.appendChild(header);
    modules.appendChild(AppSearch());
    modules.appendChild(LauncherGrid(app => app.category !== "games"));
    page.appendChild(modules);

    return page;
}
