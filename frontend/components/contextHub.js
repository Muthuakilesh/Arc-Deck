import state from "../js/state.js";
import { loadActivitySuggestions, loadActivitySummary, recordActivity } from "../js/activity.js";
import { focusedApp, runAppAction } from "../js/apps.js";
import { off, on } from "../js/events.js";
import { getFocusSession, remainingSeconds } from "../js/focus.js";
import { runScene } from "../js/scenes.js";
import { toast } from "../js/toast.js";
import openSceneEditor from "./sceneEditor.js";


const DISMISS_KEY = "arcdeck.suggestionDismissed";
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;


function formatRemaining(seconds) {
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return `${minutes}:${String(rest).padStart(2, "0")}`;
}


function dismissalState(id) {
    try {
        const values = JSON.parse(localStorage.getItem(DISMISS_KEY) || "{}");
        const value = values[id];
        if (value && typeof value === "object")
            return { permanent: value.permanent === true, temporary: Number(value.at) > Date.now() - DISMISS_MS };
        return { permanent: false, temporary: Number(value) > Date.now() - DISMISS_MS };
    } catch (error) {
        return { permanent: false, temporary: false };
    }
}


function hidden(id) {
    const state = dismissalState(id);
    return state.permanent || state.temporary;
}


function dismiss(id, permanent = false) {
    try {
        const values = JSON.parse(localStorage.getItem(DISMISS_KEY) || "{}");
        values[id] = permanent ? { permanent: true, at: Date.now() } : { at: Date.now() };
        localStorage.setItem(DISMISS_KEY, JSON.stringify(values));
    } catch (error) {
        // Dismissal is best effort when storage is unavailable.
    }
}


export default function ContextHub() {
    const section = document.createElement("section");
    section.className = "module context-hub";
    let summary = null;
    let suggestions = [];
    let pressureSince = {};
    let timer = 0;
    const shown = {};

    const render = () => {
        if (!section.parentNode)
            return;

        const focus = getFocusSession();
        const app = focusedApp();
        const running = state.apps.filter(item => item.running).length;
        const pressure = Object.keys(pressureSince).find(key => Date.now() - pressureSince[key] >= 20000);
        let kicker = "RIGHT NOW";
        let title = state.connected ? "Your PC is ready" : "Reconnecting to your PC";
        let detail = running ? `${running} configured app${running === 1 ? "" : "s"} running` : "No configured apps are running";
        const actions = [];

        if (pressure) {
            kicker = "SYSTEM ATTENTION";
            title = `${pressure.toUpperCase()} has stayed above 90%`;
            detail = `${pressure.toUpperCase()} has remained above 90% for ${Math.floor((Date.now() - pressureSince[pressure]) / 1000)} seconds.`;
        } else if (focus && (focus.status === "active" || focus.status === "paused")) {
            kicker = focus.status === "paused" ? "FOCUS PAUSED" : "FOCUS ACTIVE";
            title = `${formatRemaining(remainingSeconds(focus))} remaining`;
            detail = focus.label || "Focus session";
        } else if (app) {
            kicker = "ACTIVE ON PC";
            title = `${app.name} is in focus`;
            detail = state.foreground && state.foreground.title ? state.foreground.title : "Contextual controls are ready.";
            const used = summary && Array.isArray(summary.top)
                ? summary.top.find(item => item.type === "app.action" && String(item.subject).toLowerCase() === String(app.name).toLowerCase())
                : null;
            const index = used && /^declared-(\d+)$/.exec(used.action);
            const action = index ? app.actions[Number(index[1]) - 1] : app.actions[0];
            if (action)
                actions.push({ label: action.label, run: () => runAppAction(app.name, action.command, "home.context") });
        }

        const candidate = suggestions.find(item => !hidden(item.id));
        const suggestion = candidate && (candidate.type !== "recurring_scene" || state.scenes.some(item => item.name === candidate.scene))
            ? candidate
            : null;
        let recommendationTitle = "";
        if (suggestion) {
            if (!shown[suggestion.id]) {
                shown[suggestion.id] = true;
                recordActivity("suggestion.shown", { subject: suggestion.id, action: suggestion.type, source: "home.context", outcome: "shown" });
            }
            if (suggestion.type === "recurring_scene") {
                const scene = state.scenes.find(item => item.name === suggestion.scene);
                if (scene) {
                    recommendationTitle = `Run ${scene.name}`;
                    actions.push({ label: "Accept / Run", run: () => runScene(scene.id), suggestion: suggestion.id });
                }
            } else {
                recommendationTitle = suggestion.type === "app_group" ? "Start your workspace setup" : "Review your repeated routine";
                actions.push({
                    label: "Accept / Run",
                    suggestion: suggestion.id,
                    run: () => {
                        const steps = suggestion.type === "app_group"
                            ? suggestion.apps.map(app => ({ app: app, command: "launch", label: "Launch" }))
                            : suggestion.actions.map(entry => {
                                const app = state.apps.find(item => item.name === entry.app);
                                const match = /^declared-(\d+)$/.exec(entry.action);
                                const action = app && match ? app.actions[Number(match[1]) - 1] : null;
                                return action ? { app: app.name, command: action.command, label: action.label } : null;
                            }).filter(Boolean);
                        openSceneEditor({
                            name: suggestion.type === "app_group" ? "Workspace" : "Routine",
                            icon: "\u26A1",
                            pinned: false,
                            steps: steps
                        });
                        return { reviewed: true };
                    }
                });
            }
            detail += ` \u00B7 Suggestion: ${suggestion.reason}`;
            title = recommendationTitle;
            detail = suggestion.reason;
        }

        if (!suggestion && !actions.length && !pressure && !(focus && (focus.status === "active" || focus.status === "paused"))) {
            kicker = "NOW";
            title = "You're all set";
            detail = "Nothing needs your attention right now.";
        }

        section.innerHTML = "<div class='module-heading'><div><p class='eyebrow'></p><h2></h2></div><span class='module-status'><span></span>Live</span></div>" +
            "<p class='context-detail'></p><div class='context-actions'></div>";
        section.querySelector(".eyebrow").textContent = kicker;
        section.querySelector("h2").textContent = title;
        section.querySelector(".context-detail").textContent = detail;
        const row = section.querySelector(".context-actions");
        actions.slice(0, 2).forEach(item => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "control-button";
            button.textContent = item.label;
            button.onclick = () => {
                if (item.suggestion)
                    recordActivity("suggestion.accepted", { subject: item.suggestion, action: "run", source: "home.context", outcome: "accepted" });
                Promise.resolve(item.run()).then(result => toast(result && result.error ? result.error : item.label));
            };
            row.appendChild(button);
            if (item.suggestion) {
                const later = document.createElement("button");
                later.type = "button";
                later.className = "context-dismiss";
                later.textContent = "Not now";
                later.onclick = () => {
                    dismiss(item.suggestion);
                    recordActivity("suggestion.dismissed", { subject: item.suggestion, action: "dismiss", source: "home.context", outcome: "dismissed" });
                    render();
                };
                row.appendChild(later);

                const suppress = document.createElement("button");
                suppress.type = "button";
                suppress.className = "context-dismiss";
                suppress.textContent = "Don't suggest this";
                suppress.onclick = () => {
                    dismiss(item.suggestion, true);
                    recordActivity("suggestion.dismissed", { subject: item.suggestion, action: "suppress", source: "home.context", outcome: "dismissed" });
                    render();
                };
                row.appendChild(suppress);
            }
        });
    };

    const updateSystem = data => {
        ["cpu", "ram", "disk"].forEach(key => {
            if (Number(data[key]) >= 90)
                pressureSince[key] = pressureSince[key] || Date.now();
            else
                delete pressureSince[key];
        });
        render();
    };
    const repaint = () => render();

    on("system:update", updateSystem);
    on("apps:foreground", repaint);
    on("apps:running", repaint);
    on("scenes:update", repaint);
    on("focus:update", repaint);

    Promise.all([loadActivitySummary(30), loadActivitySuggestions()]).then(values => {
        summary = values[0] && !values[0].error ? values[0] : null;
        suggestions = values[1] && Array.isArray(values[1].suggestions) ? values[1].suggestions : [];
        render();
    });
    timer = window.setInterval(render, 1000);
    render();

    const observer = new MutationObserver(() => {
        if (section.parentNode)
            return;
        window.clearInterval(timer);
        off("system:update", updateSystem);
        off("apps:foreground", repaint);
        off("apps:running", repaint);
        off("scenes:update", repaint);
        off("focus:update", repaint);
        observer.disconnect();
    });
    observer.observe(document.getElementById("app-view"), { childList: true });

    return section;
}