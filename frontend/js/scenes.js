import { del, get, post } from "./api.js";

import state from "./state.js";

import { emit } from "./events.js";


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
    return post("/scenes/" + encodeURIComponent(id) + "/run", {}).then(result => {
        state.sceneRun = result || null;
        emit("scenes:run", state.sceneRun);
        return result;
    });
}
