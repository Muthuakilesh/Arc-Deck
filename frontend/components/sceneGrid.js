import { loadApps } from "../js/apps.js";
import { loadScenes, runScene } from "../js/scenes.js";
import { off, on } from "../js/events.js";
import { toast } from "../js/toast.js";

import openSceneEditor from "./sceneEditor.js";


function card(scene) {
    const element = document.createElement("div");
    element.className = "scene-card glass card";

    const run = document.createElement("button");
    run.type = "button";
    run.className = "scene-run";
    run.dataset.scene = scene.id;

    const icon = document.createElement("span");
    icon.className = "scene-icon";
    icon.textContent = scene.icon || "\u2726";

    const name = document.createElement("span");
    name.className = "scene-title";
    name.textContent = scene.name;

    const count = document.createElement("span");
    count.className = "scene-steps";
    count.textContent = (scene.steps || []).length + " steps";

    run.appendChild(icon);
    run.appendChild(name);
    run.appendChild(count);

    run.onclick = () => {
        run.classList.add("running");

        runScene(scene.id).then(result => {
            run.classList.remove("running");
            toast(result && result.error ? result.error : "Ran " + scene.name);
        });
    };

    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "scene-edit";
    edit.textContent = "\u270E";
    edit.setAttribute("aria-label", "Edit " + scene.name);
    edit.onclick = () => openSceneEditor(scene);

    element.appendChild(run);
    element.appendChild(edit);

    return element;
}


// Scenes are the one part of the deck built on the phone, so the list is also
// where they are created and edited.
export default function SceneGrid() {
    const wrapper = document.createElement("div");
    wrapper.className = "scene-grid";

    const empty = document.createElement("p");
    empty.className = "mix-empty";
    empty.textContent = "No scenes yet. Build one from the actions your apps already have.";

    const create = document.createElement("button");
    create.type = "button";
    create.className = "scene-new";
    create.textContent = "+ New scene";
    create.onclick = () => openSceneEditor(null);

    function render(scenes) {
        while (wrapper.firstChild)
            wrapper.removeChild(wrapper.firstChild);

        if (!scenes.length)
            wrapper.appendChild(empty);

        scenes.forEach(scene => wrapper.appendChild(card(scene)));
        wrapper.appendChild(create);
    }

    function repaint(scenes) {
        if (!wrapper.parentNode) {
            off("scenes:update", repaint);
            return;
        }

        render(scenes);
    }

    // The editor picks steps out of the app list, so it has to be loaded too.
    loadApps();
    loadScenes().then(render);
    on("scenes:update", repaint);

    return wrapper;
}
