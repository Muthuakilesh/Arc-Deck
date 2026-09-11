const form = document.querySelector("#pair");
const server = document.querySelector("#server");
const pin = document.querySelector("#pin");
const status = document.querySelector("#status");

chrome.storage.local.get("server").then(saved => { if (saved.server) server.value = saved.server; });

async function showPairingState() {
    const saved = await chrome.storage.local.get(["server", "token"]);
    if (!saved.token)
        return;
    try {
        const response = await fetch(`${(saved.server || "http://localhost:5000").replace(/\/$/, "")}/api/auth/session`, {
            headers: { "X-ArcDeck-Token": saved.token }
        });
        const data = await response.json();
        status.textContent = data.authenticated ? "Paired. This browser reconnects automatically." : "Pairing expired; enter the PIN again.";
    } catch (error) {
        status.textContent = "Paired. It will reconnect when ArcDeck starts.";
    }
}

showPairingState();

form.addEventListener("submit", async event => {
    event.preventDefault();
    const base = server.value.trim().replace(/\/$/, "");
    status.textContent = "Pairing…";
    try {
        const response = await fetch(`${base}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pin: pin.value.trim() })
        });
        const data = await response.json();
        if (!response.ok || !data.token)
            throw new Error(data.error || "Could not pair");
        await chrome.storage.local.set({ server: base, token: data.token });
        pin.value = "";
        status.textContent = "Paired. Open or refresh a YouTube tab.";
    } catch (error) {
        status.textContent = error.message || "Could not reach ArcDeck.";
    }
});
