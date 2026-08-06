import { click, getSensitivity, move, press, scroll, setSensitivity } from "../js/trackpad.js";

// A tap is a touch that neither lasted nor travelled: past either of these the
// finger was pointing, not clicking.
const TAP_MS = 250;
const TAP_SLOP = 10;

// Pixels of finger travel per scroll notch.
const SCROLL_STEP = 14;

// The second tap of a double tap has to land soon after the first.
const DOUBLE_TAP_MS = 300;


export default function Trackpad() {
    const pad = document.createElement("div");
    pad.className = "glass trackpad";

    pad.innerHTML = `
<h3>Trackpad</h3>
<div class="surface" aria-label="Trackpad. Drag to move, tap to click, two fingers to scroll.">
    <span class="surface-hint">Tap to click &middot; two fingers to scroll &middot; double-tap and hold to drag</span>
</div>
<div class="buttons">
    <button type="button" id="left">Left</button>
    <button type="button" id="right">Right</button>
</div>
<div class="pad-speed">
    <label for="pad-sensitivity">Speed</label>
    <input type="range" id="pad-sensitivity" min="0.6" max="3" step="0.2">
    <span class="pad-speed-value"></span>
</div>`;

    const surface = pad.querySelector(".surface");
    const slider = pad.querySelector("#pad-sensitivity");
    const readout = pad.querySelector(".pad-speed-value");

    slider.value = String(getSensitivity());
    readout.textContent = Number(slider.value).toFixed(1) + "x";

    slider.oninput = () => {
        setSensitivity(parseFloat(slider.value));
        readout.textContent = Number(slider.value).toFixed(1) + "x";
    };

    // Movement is accumulated and flushed once per frame. A touchmove can fire
    // faster than the network can carry it, and sending every one is what makes
    // the pointer lag behind the finger.
    let pendingX = 0;
    let pendingY = 0;
    let scrolled = 0;
    let queued = false;

    function flush() {
        queued = false;

        if (pendingX || pendingY) {
            move(pendingX, pendingY);
            pendingX = 0;
            pendingY = 0;
        }

        const notches = scrolled / SCROLL_STEP;
        const whole = notches > 0 ? Math.floor(notches) : Math.ceil(notches);

        if (whole) {
            // Dragging the content up scrolls down, as on a phone.
            scroll(-whole);
            scrolled -= whole * SCROLL_STEP;
        }
    }

    function queue() {
        if (queued)
            return;

        queued = true;
        window.requestAnimationFrame(flush);
    }

    let lastX = 0;
    let lastY = 0;
    let startedAt = 0;
    let travelled = 0;
    let fingers = 0;
    let lastTapAt = 0;
    let dragging = false;

    surface.addEventListener("touchstart", event => {
        const touch = event.touches[0];

        lastX = touch.clientX;
        lastY = touch.clientY;
        startedAt = Date.now();
        travelled = 0;
        fingers = Math.max(fingers, event.touches.length);

        // Second tap of a double tap, still held: hold the button down so the
        // move that follows drags whatever is under the pointer.
        if (event.touches.length === 1 && Date.now() - lastTapAt < DOUBLE_TAP_MS) {
            dragging = true;
            surface.classList.add("dragging");
            press("left", true);
        }
    });

    surface.addEventListener("touchmove", event => {
        event.preventDefault();

        const touch = event.touches[0];
        const dx = touch.clientX - lastX;
        const dy = touch.clientY - lastY;

        lastX = touch.clientX;
        lastY = touch.clientY;
        travelled += Math.abs(dx) + Math.abs(dy);

        if (event.touches.length > 1)
            scrolled += dy;
        else {
            pendingX += dx;
            pendingY += dy;
        }

        queue();
    }, { passive: false });

    surface.addEventListener("touchend", event => {
        if (event.touches.length)
            return;

        const quick = Date.now() - startedAt < TAP_MS && travelled < TAP_SLOP;

        if (dragging) {
            dragging = false;
            surface.classList.remove("dragging");
            press("left", false);
        } else if (quick && fingers > 1)
            click("right");
        else if (quick) {
            click("left");
            lastTapAt = Date.now();
        }

        fingers = 0;
    });

    // Safari cancels the gesture for a call or a system swipe; without this the
    // left button would stay held down on the PC.
    surface.addEventListener("touchcancel", () => {
        if (dragging) {
            dragging = false;
            surface.classList.remove("dragging");
            press("left", false);
        }

        fingers = 0;
    });

    pad.querySelector("#left").onclick = () => click("left");
    pad.querySelector("#right").onclick = () => click("right");

    return pad;
}
