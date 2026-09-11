import mountChrome from "../js/chrome.js";
import PageIntro from "../components/pageIntro.js";
import { iconMarkup } from "../components/icon.js";
import { get, post } from "../js/api.js";

function settingTile(kind, label, icon, note) {
    return `<button type="button" class="quick-setting-tile" data-setting="${kind}">
        <span class="quick-setting-icon">${iconMarkup(icon, { size: 22 })}</span>
        <span><strong>${label}</strong><small data-${kind}-state>${note}</small></span>
        <span class="quick-setting-switch" data-${kind}-switch aria-hidden="true"></span>
    </button>`;
}

export default function QuickSettingsPage() {
    const page = document.createElement("div");
    page.className = "quick-settings page ios-modular-page";
    mountChrome();
    page.appendChild(PageIntro({ eyebrow: "PC QUICK SETTINGS", title: "Connection center", icon: "settings", meta: "Network / devices / display" }));

    const card = document.createElement("section");
    card.className = "glass card module quick-settings-card";
    card.innerHTML = `<div class="quick-settings-heading"><div><p class="eyebrow">CONNECTIONS</p><h2>PC controls</h2></div><button type="button" class="control-button" data-panel title="Open Windows Quick Settings" aria-label="Open Windows Quick Settings">${iconMarkup("settings", { size: 19 })}</button></div>
        <div class="quick-settings-grid">
            ${settingTile("wifi", "Wi‑Fi", "wifi", "Checking…")}
            ${settingTile("bluetooth", "Bluetooth", "bluetooth", "Checking…")}
        </div>
        <p class="quick-settings-status" data-status aria-live="polite"></p>
        <p class="quick-settings-warning">Turning off Wi‑Fi disconnects this phone until the PC reconnects to your network.</p>`;

    const shortcuts = document.createElement("section");
    shortcuts.className = "glass card module quick-settings-shortcuts";
    shortcuts.innerHTML = `<p class="eyebrow">WINDOWS SETTINGS</p><h2>More controls</h2><div class="quick-settings-links">
        <button type="button" data-open="network">Network</button><button type="button" data-open="bluetooth">Bluetooth</button>
        <button type="button" data-open="display">Display</button><button type="button" data-open="focus">Focus</button><button type="button" data-open="power">Power</button>
    </div>`;

    const stateNote = card.querySelector("[data-status]");
    const paint = data => {
        if (!data || data.error) {
            stateNote.textContent = (data && data.error) || "Could not read Windows quick settings.";
            return;
        }
        if (!data.available) {
            stateNote.textContent = data.reason || "Quick settings are unavailable.";
            return;
        }
        ["wifi", "bluetooth"].forEach(kind => {
            const enabled = data[kind];
            const tile = card.querySelector(`[data-setting="${kind}"]`);
            const label = card.querySelector(`[data-${kind}-state]`);
            tile.classList.toggle("is-on", enabled === true);
            tile.classList.toggle("is-unavailable", enabled === null);
            label.textContent = enabled === null ? "Unavailable" : (enabled ? "On" : "Off");
        });
        stateNote.textContent = "";
    };

    const refresh = () => get("/quick-settings").then(paint);
    const run = async (action, enabled) => {
        if (action === "wifi" && enabled === false && !window.confirm("Turn off Wi‑Fi? Your phone will disconnect from ArcDeck until the PC reconnects."))
            return;
        stateNote.textContent = "Sending…";
        const result = await post("/quick-settings/action", { action, enabled });
        if (result && result.error) {
            stateNote.textContent = result.error;
            return;
        }
        stateNote.textContent = action === "wifi" && enabled === false ? "Wi‑Fi disabled. Reconnect the PC, then reopen ArcDeck." : "Updated.";
        window.setTimeout(refresh, 700);
    };

    card.querySelector("[data-panel]").onclick = () => run("panel");
    card.querySelectorAll("[data-setting]").forEach(tile => {
        tile.onclick = () => run(tile.dataset.setting, !tile.classList.contains("is-on"));
    });
    shortcuts.querySelectorAll("[data-open]").forEach(button => {
        button.onclick = () => run(button.dataset.open);
    });

    page.append(card, shortcuts);
    refresh();
    return page;
}
