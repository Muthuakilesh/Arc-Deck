import { del, get, post } from "./api.js";

import state from "./state.js";

import { emit } from "./events.js";
import { startFocus } from "./focus.js";


export async function loadScenes() {
    const data = await get("/scenes");

    state.scenes = data && data.scenes ? data.scenes : [];
    emit("scenes:update", state.scenes);

    return state.scenes;
}


export async function saveScene(scene) {
    const result = await post("/scenes", scene);

    if (result && !result.error)
        await loadScenes();

    return result;
}


export async function deleteScene(id) {
    const result = await del("/scenes/" + encodeURIComponent(id));

    if (result && !result.error)
        await loadScenes();

    return result;
}


export function runScene(id) {
    return startScene(id);
}


const activeRuns = {};


export async function startScene(id, onProgress) {
    const started = await post("/scenes/" + encodeURIComponent(id) + "/start", {});
    if (!started || started.error)
        return started;

    activeRuns[id] = started.run_id;

    while (activeRuns[id] === started.run_id) {
        const data = await get("/scenes/runs/" + encodeURIComponent(started.run_id));
        const run = data && data.run ? data.run : data;
        if (!run || run.error)
            return run;

        state.sceneRun = run;
        emit("scenes:run", run);
        if (onProgress)
            onProgress(run);

        if (["completed", "failed", "cancelled"].includes(run.status)) {
            delete activeRuns[id];
            if (run.status === "completed" && Array.isArray(run.directives)) {
                run.directives.forEach(directive => {
                    if (directive.type === "focus_timer")
                        startFocus(directive.seconds, directive.label || "Focus", directive.scene_id || id);
                });
            }
            return run;
        }

        await new Promise(resolve => window.setTimeout(resolve, 250));
    }

    return state.sceneRun;
}


export function cancelScene(id) {
    const runId = activeRuns[id];
    if (!runId)
        return Promise.resolve({ error: "Scene is not running" });
    return post("/scenes/runs/" + encodeURIComponent(runId) + "/cancel", {});
}


export function loadSceneRuns(limit = 30) {
    return get("/scenes/runs?limit=" + encodeURIComponent(limit));
}
