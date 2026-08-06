import mountChrome from "../js/chrome.js";
import HeroCard from "../components/heroCard.js";
import GlassCard from "../components/glassCard.js";
import FocusCard from "../components/focusCard.js";
import RunningStrip from "../components/runningStrip.js";
import VolumeControl from "../components/volumeControl.js";

import { off, on } from "../js/events.js";

export default function Home() {
    const page = document.createElement("div");
    page.className = "home page";

    mountChrome();

    page.appendChild(HeroCard());

    // small summary widgets
    const widgets = document.createElement("div");
    widgets.className = "widgets";
    const cpu = GlassCard({ title: "CPU", content: "<h2 id='cpu'>0%</h2>" });
    const ram = GlassCard({ title: "RAM", content: "<h2 id='ram'>0%</h2>" });
    const disk = GlassCard({ title: "Disk", content: "<h2 id='disk'>0%</h2>" });
    widgets.append(cpu, ram, disk);
    page.appendChild(widgets);

    page.appendChild(FocusCard());
    page.appendChild(RunningStrip());
    page.appendChild(VolumeControl());

    function update(data) {
        if (!page.parentNode) {
            off("system:update", update);
            return;
        }

        const cpuEl = document.getElementById("cpu");
        const ramEl = document.getElementById("ram");
        const diskEl = document.getElementById("disk");
        if (cpuEl) cpuEl.textContent = `${data.cpu}%`;
        if (ramEl) ramEl.textContent = `${data.ram}%`;
        if (diskEl && data.disk !== undefined) diskEl.textContent = `${data.disk}%`;
    }

    on("system:update", update);

    return page;
}
