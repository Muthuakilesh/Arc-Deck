import { cancelScene, loadScenes, runScene } from "../js/scenes.js";
import { off, on } from "../js/events.js";
import { toast } from "../js/toast.js";


// Pinned scenes only: the home screen is the first thing that loads, so it
// shows the handful worth one tap rather than the whole list.
export default function SceneStrip() {
    const card = document.createElement("section");
    card.className = "glass card module module-scene-strip scene-strip";
    card.style.display = "none";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "SCENES";

    const row = document.createElement("div");
    row.className = "chip-row";

    card.appendChild(eyebrow);
    card.appendChild(row);

    function render(scenes) {
        const pinned = scenes.filter(scene => scene.pinned === true);

        card.style.display = pinned.length ? "block" : "none";

        while (row.firstChild)
            row.removeChild(row.firstChild);

        pinned.forEach(scene => {
            const chip = document.createElement("button");

            chip.type = "button";
            chip.className = "chip";
            chip.textContent = (scene.icon ? scene.icon + " " : "") + scene.name;

            chip.onclick = () => {
                if (chip.classList.contains("running")) {
                    chip.textContent = "Cancelling\u2026";
                    cancelScene(scene.id);
                    return;
                }

                chip.classList.add("running");
                chip.textContent = "Starting\u2026";

                runScene(scene.id, progress => {
                    chip.textContent = `Step ${progress.step || 0}/${progress.steps || 0}`;
                }).then(result => {
                    chip.classList.remove("running");
                    chip.textContent = (scene.icon ? scene.icon + " " : "") + scene.name;
                    toast(result && result.error ? result.error : (result.status === "cancelled" ? "Scene cancelled" : "Ran " + scene.name));
                });
            };

            row.appendChild(chip);
        });
    }

    function repaint(scenes) {
        if (!card.parentNode) {
            off("scenes:update", repaint);
            return;
        }

        render(scenes);
    }

    loadScenes().then(render);
    on("scenes:update", repaint);

    return card;
}
