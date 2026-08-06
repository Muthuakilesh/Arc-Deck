import mountChrome from "../js/chrome.js";

import { fetchFrame, tapScreen } from "../js/screen.js";
import { toast } from "../js/toast.js";


// Frames are fetched one at a time and the next is only asked for once the last
// one has arrived, so a slow link degrades to fewer frames rather than a queue.
const RATES = [
    { label: "Slow", gap: 2000, width: 320, quality: 35 },
    { label: "Normal", gap: 900, width: 480, quality: 45 },
    { label: "Sharp", gap: 700, width: 720, quality: 60 }
];


export default function ScreenPage() {
    const page = document.createElement("div");
    page.className = "screenpeek page";

    mountChrome();

    let rate = RATES[1];
    let running = true;
    let timer = 0;
    let url = "";
    let started = false;

    const header = document.createElement("h2");
    header.textContent = "Screen";

    const picker = document.createElement("div");
    picker.className = "pad-profiles";

    const card = document.createElement("div");
    card.className = "glass card screen-card";

    const shot = document.createElement("img");
    shot.className = "screen-shot";
    shot.alt = "Your PC screen. Tap to click there.";

    const status = document.createElement("p");
    status.className = "screen-status";
    status.textContent = "Connecting\u2026";

    const pause = document.createElement("button");
    pause.type = "button";
    pause.className = "chip";
    pause.textContent = "Pause";

    card.appendChild(shot);
    card.appendChild(status);

    page.appendChild(header);
    page.appendChild(picker);
    page.appendChild(card);

    function stop() {
        running = false;

        if (timer) {
            window.clearTimeout(timer);
            timer = 0;
        }
    }

    function schedule() {
        if (!running)
            return;

        timer = window.setTimeout(tick, rate.gap);
    }

    function tick() {
        // The view was replaced by another page; stop hitting the PC. The first
        // frame is asked for before the router has attached the page, so that
        // one is let through.
        if (started && !page.parentNode) {
            stop();
            return;
        }

        started = true;

        fetchFrame(rate.width, rate.quality).then(blob => {
            const next = window.URL.createObjectURL(blob);

            if (url)
                window.URL.revokeObjectURL(url);

            url = next;
            shot.src = next;
            status.textContent = rate.label + " \u00b7 tap the picture to click there";
            schedule();
        }).catch(error => {
            status.textContent = String(error.message || error);
            schedule();
        });
    }

    shot.onclick = event => {
        const rect = shot.getBoundingClientRect();

        if (!rect.width || !rect.height)
            return;

        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;

        tapScreen(x, y).then(result => {
            if (result && result.error)
                toast(result.error);
        });
    };

    RATES.forEach(entry => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "chip";
        button.textContent = entry.label;

        if (entry === rate)
            button.classList.add("active");

        button.onclick = () => {
            rate = entry;

            picker.querySelectorAll(".chip").forEach(chip => {
                chip.classList.remove("active");
            });

            button.classList.add("active");
        };

        picker.appendChild(button);
    });

    pause.onclick = () => {
        if (running) {
            stop();
            pause.textContent = "Resume";
            status.textContent = "Paused";
        } else {
            running = true;
            pause.textContent = "Pause";
            tick();
        }
    };

    picker.appendChild(pause);

    tick();

    return page;
}
