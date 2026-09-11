const DEFAULT_SERVER = "http://localhost:5000";

async function settings() {
    const stored = await chrome.storage.local.get(["server", "token"]);
    return {
        server: (stored.server || DEFAULT_SERVER).replace(/\/$/, ""),
        token: stored.token || ""
    };
}

async function report(tabId, state) {
    const { server, token } = await settings();
    if (!token)
        return;

    try {
        const response = await fetch(`${server}/api/media/bridge/state`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-ArcDeck-Token": token },
            body: JSON.stringify(state)
        });
        const result = await response.json().catch(() => null);
        if (response.status === 401) {
            await chrome.storage.local.remove("token");
            return;
        }
        if (response.ok && result && result.command)
            chrome.tabs.sendMessage(tabId, { type: "arcdeck-command", command: result.command });
    } catch (error) {
        // ArcDeck can be stopped or restarted without disrupting YouTube.
    }
}

chrome.runtime.onMessage.addListener((message, sender) => {
    if (message.type === "arcdeck-media-state" && sender.tab && sender.tab.id !== undefined)
        report(sender.tab.id, message.state);
});
