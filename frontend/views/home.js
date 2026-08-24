import mountChrome from "../js/chrome.js";
import HeroCard from "../components/heroCard.js";
import GlassCard from "../components/glassCard.js";
import FocusCard from "../components/focusCard.js";
import RunningStrip from "../components/runningStrip.js";
import SceneStrip from "../components/sceneStrip.js";
import VolumeControl from "../components/volumeControl.js";
import LauncherCard from "../components/launcherCard.js";

import { off, on } from "../js/events.js";
import { getFavoriteNames, getRecentNames, loadApps } from "../js/apps.js";
import state from "../js/state.js";

export default function Home() {
    const page = document.createElement("div");
    page.className = "home page";

    mountChrome();

    page.appendChild(HeroCard());

    // small summary widgets
    const widgets = document.createElement("div");
    widgets.className = "widgets";
    const cpu = GlassCard({ title: "CPU", content: "<h2 id='cpu'>0%</h2>" });
    const ram = GlassCard({ title: "RAM", content: "<h2 id='ram'>0%</h2>" });
    const disk = GlassCard({ title: "Disk", content: "<h2 id='disk'>0%</h2>" });
    widgets.append(cpu, ram, disk);
    page.appendChild(widgets);

    const favoritesSection = document.createElement("section");
    favoritesSection.className = "quick-apps card glass";
    favoritesSection.innerHTML = "<p class='eyebrow'>FAVORITES</p>";
    const favoritesGrid = document.createElement("div");
    favoritesGrid.className = "quick-apps-grid";
    favoritesSection.appendChild(favoritesGrid);
    page.appendChild(favoritesSection);

    const recentsSection = document.createElement("section");
    recentsSection.className = "quick-apps card glass";
    recentsSection.innerHTML = "<p class='eyebrow'>RECENT APPS</p>";
    const recentsGrid = document.createElement("div");
    recentsGrid.className = "quick-apps-grid";
    recentsSection.appendChild(recentsGrid);
    page.appendChild(recentsSection);

    page.appendChild(FocusCard());
    page.appendChild(SceneStrip());
    page.appendChild(RunningStrip());
    page.appendChild(VolumeControl());

    const byName = names => {
        const wanted = names.map(name => String(name || "").toLowerCase());

        return wanted.map(name => {
            return state.apps.find(app => String(app.name || "").toLowerCase() === name);
        }).filter(Boolean);
    };

    const fillQuickGrid = (grid, apps, emptyLabel) => {
        grid.innerHTML = "";

        if (!apps.length) {
            const empty = document.createElement("p");
            empty.className = "quick-apps-empty";
            empty.textContent = emptyLabel;
            grid.appendChild(empty);
            return;
        }

        apps.forEach(app => {
            const card = LauncherCard(app);
            card.classList.add("quick-app-card");
            grid.appendChild(card);
        });
    };

    const renderQuickApps = () => {
        if (!page.parentNode)
            return;

        fillQuickGrid(
            favoritesGrid,
            byName(getFavoriteNames()).slice(0, 6),
            "Favorite apps appear here."
        );
        fillQuickGrid(
            recentsGrid,
            byName(getRecentNames()).slice(0, 6),
            "Launch an app to build recents."
        );
    };

    function update(data) {
        if (!page.parentNode) {
            off("system:update", update);
            off("apps:running", renderQuickApps);
            off("apps:favorites", renderQuickApps);
            off("apps:recents", renderQuickApps);
            return;
        }

        const cpuEl = document.getElementById("cpu");
        const ramEl = document.getElementById("ram");
        const diskEl = document.getElementById("disk");
        if (cpuEl) cpuEl.textContent = `${data.cpu}%`;
        if (ramEl) ramEl.textContent = `${data.ram}%`;
        if (diskEl && data.disk !== undefined) diskEl.textContent = `${data.disk}%`;
    }

    on("system:update", update);
    on("apps:running", renderQuickApps);
    on("apps:favorites", renderQuickApps);
    on("apps:recents", renderQuickApps);

    loadApps().then(renderQuickApps);

    return page;
}
