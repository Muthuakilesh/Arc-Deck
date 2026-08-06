import router from "./router.js";

import Home from "../views/home.js";
import AppsPage from "../views/appsPage.js";
import GamesPage from "../views/gamesPage.js";
import MediaPage from "../views/mediaPage.js";
import ControlPage from "../views/controlPage.js";
import StatsPage from "../views/statsPage.js";
import ClockPage from "../views/clockPage.js";

import { initTheme } from "./theme.js";
import { startClock } from "./clock.js";
import { connectSocket } from "./websocket.js";
import { ensureAuthenticated } from "./auth.js";
import initShell from "./shell.js";

router.register("home", Home);
router.register("apps", AppsPage);
router.register("games", GamesPage);
router.register("media", MediaPage);
router.register("control", ControlPage);
router.register("stats", StatsPage);
router.register("clock", ClockPage);

function dismissSplash() {
    const splash = document.getElementById("splash");

    if (splash && splash.parentNode)
        splash.parentNode.removeChild(splash);
}


function registerWorker() {
    if (!("serviceWorker" in navigator) || location.protocol === "file:")
        return;

    navigator.serviceWorker.register("./sw.js").catch(error => {
        console.warn("Service worker registration failed", error);
    });
}


async function start() {
    initTheme();

    // The PIN card renders into this screen, so the splash goes first.
    dismissSplash();

    // Nothing may talk to the PC until this phone is paired.
    await ensureAuthenticated();

    initShell();
    connectSocket();
    router.navigate("home");
    startClock();
    registerWorker();
}

// Surface startup errors into the UI so they are visible in the browser
function showError(err) {
    try {
        dismissSplash();

        const container = document.getElementById('app-view');
        if (container) {
            container.innerHTML = `<div class="error-overlay"><h2>Application error</h2><pre>${String(err).replace(/</g,'&lt;')}</pre></div>`;
        } else {
            document.body.insertAdjacentHTML('beforeend', `<div class="error-overlay"><h2>Application error</h2><pre>${String(err).replace(/</g,'&lt;')}</pre></div>`);
        }
    } catch (e) {
        console.error('Failed to render error overlay', e);
    }
}

window.addEventListener('error', (ev) => {
    console.error('Unhandled error', ev.error || ev.message);
    showError(ev.error || ev.message);
});

window.addEventListener('unhandledrejection', (ev) => {
    console.error('Unhandled rejection', ev.reason);
    showError(ev.reason);
});

start().catch(error => {
    console.error("App failed to start:", error);
    showError(error);
});
