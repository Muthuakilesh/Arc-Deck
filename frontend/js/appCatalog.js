const CAPABILITIES = [
    { id: "notes", name: "Notes", category: "Personal", icon: "edit", route: "notes", status: () => "Quick capture" },
    { id: "clock", name: "Clock", category: "Personal", icon: "clock", route: "clock", status: () => "Time + focus" },
    { id: "control", name: "Controls", category: "System", icon: "control", route: "control", status: () => "Remote surface" },
    { id: "quick-settings", name: "Quick settings", category: "System", icon: "settings", route: "quick-settings", status: () => "Wi‑Fi + Bluetooth" },
    { id: "stats", name: "Monitor", category: "System", icon: "stats", route: "stats", status: state => state.connected ? `CPU ${Math.round(state.system.cpu || 0)}%` : "Offline" },
    { id: "media", name: "Media", category: "Media", icon: "media", route: "media", status: state => state.connected ? "Playback + audio" : "Offline" },
    { id: "scenes", name: "Automations", category: "Utilities", icon: "scenes", route: "scenes", status: () => "Run routines" },
    { id: "screen", name: "Screen", category: "Utilities", icon: "screen", route: "screen", status: () => "Remote display" },
    { id: "gamepad", name: "Gamepad", category: "Utilities", icon: "gamepad", route: "gamepad", status: () => "Touch controller" },
    { id: "apps", name: "Desktop apps", category: "Desktop", icon: "apps", route: "apps", status: () => "Launch + manage" }
];

export function capabilityCatalog() {
    return CAPABILITIES.map(item => ({ ...item, kind: "capability" }));
}

export function catalogForApps(apps) {
    return capabilityCatalog().concat((apps || []).map(app => ({
        id: `desktop:${String(app.name || "").toLowerCase()}`,
        name: app.name,
        category: app.category === "games" ? "Desktop / Games" : "Desktop",
        icon: app.icon || "app",
        image: app.image,
        kind: "desktop",
        app: app,
        status: () => app.running ? "Running" : "Launch"
    })));
}

export function defaultHomeApps() {
    return ["notes", "clock", "media", "control", "stats", "scenes", "apps"];
}

export function catalogCategories(catalog) {
    return [...new Set(catalog.map(item => item.category))];
}
