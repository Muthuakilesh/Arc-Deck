import mountChrome from "../js/chrome.js";
import SceneGrid from "../components/sceneGrid.js";

export default function ScenesPage() {
    const page = document.createElement("div");
    page.className = "scenes page ios-modular-page";

    mountChrome();

    const header = document.createElement("h2");
    header.textContent = "Scenes";
    page.appendChild(header);

    const modules = document.createElement("div");
    modules.className = "module-grid module-grid-scenes";

    const sceneModule = document.createElement("section");
    sceneModule.className = "glass card module module-scenes";
    sceneModule.appendChild(SceneGrid());

    modules.appendChild(sceneModule);
    page.appendChild(modules);

    return page;
}
