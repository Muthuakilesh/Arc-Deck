import TopBar from "../components/topbar.js";
import Dock from "../components/dock.js";
import { loadApps, launchApp } from "../js/apps.js";
import LauncherCard from "../components/launcherCard.js";

export default function GamesPage() {
    const page = document.createElement('div');
    page.className = 'games page';

    document.getElementById('topbar').replaceChildren(TopBar());
    document.getElementById('dock').replaceChildren(Dock());

    const header = document.createElement('h2');
    header.textContent = 'Games';
    page.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'launcher-grid';

    loadApps().then(apps => {
        apps.filter(a => a.category === 'games' || /steam|epic|gog|battle/.test((a.name||'').toLowerCase())).forEach(app => {
            const card = LauncherCard(app);
            card.onclick = () => launchApp(app.name);
            grid.appendChild(card);
        });
    });

    page.appendChild(grid);
    return page;
}
