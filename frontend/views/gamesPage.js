import mountChrome from "../js/chrome.js";
import LauncherGrid from "../components/launcherGrid.js";


export default function GamesPage() {
    const page = document.createElement("div");
    page.className = "games page";

    mountChrome();

    const header = document.createElement("h2");
    header.textContent = "Games";

    page.appendChild(header);
    page.appendChild(LauncherGrid(app => app.category === "games"));

    return page;
}
