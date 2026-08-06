import TopBar from "../components/topbar.js";
import Dock from "../components/dock.js";
import { startSystemMonitor } from "./system.js";
import { syncVolume } from "./volume.js";

function initShell() {
    startSystemMonitor();
    syncVolume();

    const topbar = document.getElementById("topbar");
    const dock = document.getElementById("dock");

    if (topbar)
        topbar.replaceChildren(TopBar());

    if (dock)
        dock.replaceChildren(Dock());
}

initShell();

export default initShell;
