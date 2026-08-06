import mountChrome from "../js/chrome.js";
import LauncherGrid from "../components/launcherGrid.js";


export default function AppsPage() {
    const page = document.createElement("div");
    page.className = "apps page";

    mountChrome();

    const header = document.createElement("h2");
    header.textContent = "Apps";

    page.appendChild(header);
    page.appendChild(LauncherGrid(app => app.category !== "games"));

    return page;
}
