import mountChrome from "./chrome.js";
import { startSystemMonitor } from "./system.js";
import { syncVolume } from "./volume.js";

export default function initShell() {
    startSystemMonitor();
    syncVolume();
    mountChrome();
}
