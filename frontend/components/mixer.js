import { loadSessions, setSessionMute, setSessionVolume } from "../js/mixer.js";


// Sessions are not broadcast: they change only when an app starts or stops
// playing, which is far rarer than a CPU tick, so the page polls instead.
const POLL = 5000;


function label(session) {
    const name = session.process || "App";

    return name.replace(/\.exe$/i, "");
}


function row(session) {
    const item = document.createElement("div");
    item.className = "mix-row";

    const head = document.createElement("div");
    head.className = "mix-head";

    const name = document.createElement("span");
    name.className = "mix-name";
    name.textContent = label(session);

    const value = document.createElement("span");
    value.className = "mix-value";

    const mute = document.createElement("button");
    mute.type = "button";
    mute.className = "mix-mute";

    const slider = document.createElement("input");
    slider.type = "range";
    slider.className = "volume-slider";
    slider.min = 0;
    slider.max = 100;
    slider.step = 1;
    slider.setAttribute("aria-label", label(session) + " volume");

    function paint(level, muted) {
        value.textContent = level + "%";
        mute.innerHTML = muted ? "&#128263;" : "&#128266;";
        mute.classList.toggle("is-muted", muted);
        // backgroundImage, not the shorthand, which would drop background-size.
        slider.style.backgroundImage =
            "linear-gradient(90deg, var(--accent) " + level + "%, rgba(255,255,255,.13) " + level + "%)";
    }

    slider.oninput = () => {
        const level = Number(slider.value);

        paint(level, mute.classList.contains("is-muted"));
        setSessionVolume(session.pid, level);
    };

    mute.onclick = () => {
        const muted = !mute.classList.contains("is-muted");

        paint(Number(slider.value), muted);
        setSessionMute(session.pid, muted);
    };

    head.appendChild(name);
    head.appendChild(value);
    head.appendChild(mute);
    item.appendChild(head);
    item.appendChild(slider);

    item.update = updated => {
        // The input owns its value while a finger is on it.
        if (document.activeElement !== slider)
            slider.value = updated.volume;

        paint(Number(slider.value), Boolean(updated.muted));
    };

    item.update(session);

    return item;
}


// Per-app volume: turn the game down without turning the call down.
export default function Mixer() {
    const card = document.createElement("section");
    card.className = "glass card mixer";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "APP MIXER";

    const empty = document.createElement("p");
    empty.className = "mix-empty";
    empty.textContent = "No app is playing audio.";

    const list = document.createElement("div");
    list.className = "mix-list";

    card.appendChild(eyebrow);
    card.appendChild(empty);
    card.appendChild(list);

    let rows = {};

    function render(sessions) {
        const seen = {};

        empty.style.display = sessions.length ? "none" : "block";

        sessions.forEach(session => {
            seen[session.pid] = true;

            // Rebuilding every row would yank the slider out from under a
            // finger mid-drag, so existing rows are updated in place.
            if (rows[session.pid])
                rows[session.pid].update(session);
            else {
                rows[session.pid] = row(session);
                list.appendChild(rows[session.pid]);
            }
        });

        Object.keys(rows).forEach(pid => {
            if (seen[pid])
                return;

            list.removeChild(rows[pid]);
            delete rows[pid];
        });
    }

    // The first pass runs before the view has appended this card, so only the
    // repeats stop when it is gone.
    function poll(first) {
        if (!first && !card.parentNode)
            return;

        loadSessions().then(sessions => {
            render(sessions);
            setTimeout(() => poll(), POLL);
        });
    }

    poll(true);

    return card;
}
