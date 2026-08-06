import mountChrome from "../js/chrome.js";
import SceneGrid from "../components/sceneGrid.js";

export default function ScenesPage() {
    const page = document.createElement("div");
    page.className = "scenes page";

    mountChrome();

    const header = document.createElement("h2");
    header.textContent = "Scenes";
    page.appendChild(header);

    page.appendChild(SceneGrid());

    return page;
}
