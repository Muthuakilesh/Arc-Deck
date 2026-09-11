import { get, post } from "../js/api.js";
import state from "../js/state.js";
import { off, on } from "../js/events.js";
import { sendClipboard, setClipboardSync } from "../js/websocket.js";


const SYNC_KEY = "arcdeck.clipboardSync";


function loadSyncPreference() {
    try {
        return localStorage.getItem(SYNC_KEY) === "1";
    } catch (error) {
        return false;
    }
}


export default function ClipboardCard() {
    const card = document.createElement("section");
    card.className = "glass card module module-clipboard clipboard-card";
    card.innerHTML = "<div class='clipboard-heading'><div><p class='eyebrow'>CLIPBOARD BRIDGE</p><h3>Move text between devices</h3></div><span class='clipboard-limit'>0 / 100k</span></div>" +
        "<textarea maxlength='100000' placeholder='Paste or type text here'></textarea>" +
        "<div class='clipboard-actions'><button type='button' class='clipboard-primary' data-pull>Read from PC</button><button type='button' data-push>Send to PC</button><button type='button' data-copy>Copy on phone</button></div>" +
        "<div class='clipboard-sync-row'><span>Clipboard Sync</span><button type='button' class='clipboard-sync-toggle' data-sync-toggle></button></div>" +
        "<p class='clipboard-status' aria-live='polite'>Text only. Nothing is saved to activity history.</p>";

    const textarea = card.querySelector("textarea");
    const status = card.querySelector(".clipboard-status");
    const limit = card.querySelector(".clipboard-limit");
    const syncToggle = card.querySelector("[data-sync-toggle]");
    state.clipboard.enabled = loadSyncPreference();
    const updateCount = () => { limit.textContent = `${textarea.value.length.toLocaleString()} / 100k`; };
    textarea.oninput = updateCount;
    const report = message => {
        status.textContent = message;
        window.setTimeout(() => { status.textContent = ""; }, 2200);
    };

    const paintSync = () => {
        syncToggle.textContent = state.clipboard.enabled ? "On" : "Off";
        syncToggle.classList.toggle("active", state.clipboard.enabled);
    };

    syncToggle.onclick = () => {
        state.clipboard.enabled = !state.clipboard.enabled;
        try {
            localStorage.setItem(SYNC_KEY, state.clipboard.enabled ? "1" : "0");
        } catch (error) {
            // The live preference still applies until reload.
        }
        setClipboardSync(state.clipboard.enabled);
        paintSync();
        report(state.clipboard.enabled ? "Clipboard sync enabled." : "Clipboard sync disabled.");
    };

    const updateFromSync = clipboard => {
        if (document.activeElement !== textarea && clipboard && typeof clipboard.text === "string") {
            textarea.value = clipboard.text;
            updateCount();
        }
        if (clipboard && clipboard.available)
            report("Synced from PC.");
    };
    const showSyncError = message => report(message);
    on("clipboard:update", updateFromSync);
    on("clipboard:error", showSyncError);
    if (state.clipboard.available && state.clipboard.text) {
        textarea.value = state.clipboard.text;
        updateCount();
    }
    paintSync();

    card.querySelector("[data-pull]").onclick = async () => {
        const result = await get("/clipboard");
        if (result && !result.error) {
            textarea.value = result.text || "";
            updateCount();
            report("Read from PC.");
        } else report((result && result.error) || "Could not read the PC clipboard.");
    };

    card.querySelector("[data-push]").onclick = async () => {
        if (!state.clipboard.enabled || !sendClipboard(textarea.value)) {
            report("Turn on Clipboard Sync to send text to PC.");
            return;
        }
        report("Sent to PC.");
    };

    card.querySelector("[data-copy]").onclick = async () => {
        if (!navigator.clipboard || !navigator.clipboard.writeText) {
            report("Phone clipboard access is unavailable.");
            return;
        }
        try {
            await navigator.clipboard.writeText(textarea.value);
            report("Copied to phone clipboard.");
        } catch (error) {
            report("Phone clipboard permission was denied.");
        }
    };

    const observer = new MutationObserver(() => {
        if (card.parentNode)
            return;
        off("clipboard:update", updateFromSync);
        off("clipboard:error", showSyncError);
        observer.disconnect();
    });
    observer.observe(document.getElementById("app-view"), { childList: true });

    return card;
}