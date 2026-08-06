import mountChrome from "../js/chrome.js";

import {
    PROFILES,
    currentProfile,
    holdKey,
    profileById,
    releaseAll,
    rememberProfile
} from "../js/gamepad.js";


// How far from where the thumb landed counts as pushing the stick, in pixels.
const DEADZONE = 14;


export default function GamepadPage() {
    const page = document.createElement("div");
    page.className = "gamepad page";

    mountChrome();

    let profile = currentProfile();

    const header = document.createElement("h2");
    header.textContent = "Gamepad";

    const picker = document.createElement("div");
    picker.className = "pad-profiles";

    const card = document.createElement("div");
    card.className = "glass card pad-card";

    const stick = document.createElement("div");
    stick.className = "pad-stick";
    stick.setAttribute("aria-label", "Movement stick");

    const nub = document.createElement("span");
    nub.className = "pad-nub";
    stick.appendChild(nub);

    const buttons = document.createElement("div");
    buttons.className = "pad-buttons";

    const note = document.createElement("p");
    note.className = "pad-note";
    note.textContent = "Keys are held while your thumb is down, so walking and sprinting work.";

    card.appendChild(stick);
    card.appendChild(buttons);

    page.appendChild(header);
    page.appendChild(picker);
    page.appendChild(card);
    page.appendChild(note);

    // Which keys this pad believes are down, so only edges are sent.
    const down = {};

    function setKey(key, wanted) {
        if (!key || down[key] === wanted)
            return;

        down[key] = wanted;
        holdKey(key, wanted);
    }

    function releaseHeld() {
        Object.keys(down).forEach(key => {
            if (down[key])
                setKey(key, false);
        });
    }

    function renderButtons() {
        buttons.innerHTML = "";

        profile.buttons.forEach(entry => {
            const button = document.createElement("button");

            button.type = "button";
            button.className = "pad-button";
            button.textContent = entry.label;

            button.addEventListener("touchstart", event => {
                event.preventDefault();
                button.classList.add("held");
                setKey(entry.key, true);
            }, { passive: false });

            const lift = () => {
                button.classList.remove("held");
                setKey(entry.key, false);
            };

            button.addEventListener("touchend", lift);
            button.addEventListener("touchcancel", lift);

            // Desktop browsers never fire the touch events, so the pad is
            // still usable (and testable) with a mouse.
            button.addEventListener("mousedown", () => {
                button.classList.add("held");
                setKey(entry.key, true);
            });

            button.addEventListener("mouseup", lift);
            button.addEventListener("mouseleave", lift);

            buttons.appendChild(button);
        });
    }

    function renderPicker() {
        picker.innerHTML = "";

        PROFILES.forEach(entry => {
            const button = document.createElement("button");

            button.type = "button";
            button.className = "chip";
            button.textContent = entry.label;

            if (entry.id === profile.id)
                button.classList.add("active");

            button.onclick = () => {
                releaseHeld();
                profile = profileById(entry.id);
                rememberProfile(profile.id);
                renderPicker();
                renderButtons();
            };

            picker.appendChild(button);
        });
    }

    let originX = 0;
    let originY = 0;

    function aim(touch) {
        const dx = touch.clientX - originX;
        const dy = touch.clientY - originY;

        // Diagonals matter (strafing while walking), so each axis is judged on
        // its own rather than picking a single direction.
        setKey(profile.stick.left, dx < -DEADZONE);
        setKey(profile.stick.right, dx > DEADZONE);
        setKey(profile.stick.up, dy < -DEADZONE);
        setKey(profile.stick.down, dy > DEADZONE);

        const limit = 34;
        const nx = Math.max(-limit, Math.min(limit, dx));
        const ny = Math.max(-limit, Math.min(limit, dy));

        nub.style.webkitTransform = "translate(" + nx + "px," + ny + "px)";
        nub.style.transform = "translate(" + nx + "px," + ny + "px)";
    }

    function centre() {
        nub.style.webkitTransform = "translate(0,0)";
        nub.style.transform = "translate(0,0)";
    }

    stick.addEventListener("touchstart", event => {
        event.preventDefault();

        const rect = stick.getBoundingClientRect();

        // The stick starts where the thumb lands, not at the centre of the
        // circle, which is what makes it comfortable one-handed.
        originX = rect.left + rect.width / 2;
        originY = rect.top + rect.height / 2;

        aim(event.touches[0]);
    }, { passive: false });

    stick.addEventListener("touchmove", event => {
        event.preventDefault();
        aim(event.touches[0]);
    }, { passive: false });

    const drop = () => {
        releaseHeld();
        centre();
    };

    stick.addEventListener("touchend", drop);
    stick.addEventListener("touchcancel", drop);

    // Switching apps or locking the phone must not leave keys held on the PC.
    document.addEventListener("visibilitychange", function onHide() {
        if (!document.hidden)
            return;

        if (!page.parentNode) {
            document.removeEventListener("visibilitychange", onHide);
            return;
        }

        releaseHeld();
        releaseAll();
    });

    renderPicker();
    renderButtons();

    return page;
}
