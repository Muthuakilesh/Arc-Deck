import mountChrome from "../js/chrome.js";
import LauncherCard from "../components/launcherCard.js";
import { loadApps, launchApp, runAppAction } from "../js/apps.js";

export default function AppsPage() {
    const page = document.createElement('div');
    page.className = 'apps page';

    mountChrome();


    const header = document.createElement('h2');
    header.textContent = 'Apps';
    page.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'launcher-grid';

    loadApps().then(apps => {
        apps.forEach(app => {
            const card = LauncherCard(app);
            card.onclick = () => launchApp(app.name);
            card.addEventListener('app:action', e => {
                const detail = e.detail || {};
                const action = detail.action || {};
                runAppAction(app.name, action.command || action.label);
            });
            grid.appendChild(card);
        });
    });

    page.appendChild(grid);
    return page;
}
