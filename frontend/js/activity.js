import { del, get, post } from "./api.js";


export function loadActivitySummary(days = 30) {
    return get("/activity/summary?days=" + encodeURIComponent(days));
}

export function loadActivitySettings() {
    return get("/activity/settings");
}

export function saveActivitySettings(settings) {
    return post("/activity/settings", settings);
}

export function loadActivityEvents(limit = 500) {
    return get("/activity?limit=" + encodeURIComponent(limit));
}

export function clearActivityEvents() {
    return del("/activity");
}

export function recordActivity(type, details = {}) {
    return post("/activity/event", {
        type: type,
        subject: details.subject || "",
        action: details.action || "",
        source: details.source || "frontend",
        outcome: details.outcome || "success",
        context: details.context || {}
    });
}

export function loadActivitySuggestions() {
    return get("/activity/suggestions");
}