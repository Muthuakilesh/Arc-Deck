import TopBar from "../components/topbar.js";
import Dock from "../components/dock.js";

export default function ClockPage() {
    const page = document.createElement("div");
    page.className = "clock-page page";
    document.getElementById("topbar").replaceChildren(TopBar());
    document.getElementById("dock").replaceChildren(Dock());
    page.innerHTML = `
        <section class="clock-hero glass card"><p class="eyebrow">ARC FOCUS</p><time class="clock-time">--:--</time><p class="clock-date">Loading date…</p></section>
        <section class="focus-card glass card"><div><p class="eyebrow">FOCUS TIMER</p><h2 data-timer>25:00</h2></div><div class="focus-controls"><button type="button" data-start>Start</button><button type="button" data-reset>Reset</button><button type="button" data-focus>Focus mode</button></div><p data-status>Ready for a focused session.</p></section>`;

    const time = page.querySelector(".clock-time"), date = page.querySelector(".clock-date"), timer = page.querySelector("[data-timer]"), start = page.querySelector("[data-start]"), status = page.querySelector("[data-status]");
    let remaining = 1500, timerId = null;
    const drawTimer = () => { timer.textContent = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`; };
    const updateClock = () => { const now = new Date(); time.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); date.textContent = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" }); page.style.setProperty("--clock-hue", String((now.getSeconds() * 6 + now.getMinutes() * 2) % 360)); };
    start.onclick = () => {
        if (timerId) { clearInterval(timerId); timerId = null; start.textContent = "Resume"; status.textContent = "Timer paused."; return; }
        start.textContent = "Pause"; status.textContent = "Focus session active.";
        timerId = setInterval(() => { if (remaining <= 1) { clearInterval(timerId); timerId = null; remaining = 0; start.textContent = "Start"; status.textContent = "Session complete."; } else { remaining -= 1; drawTimer(); } }, 1000);
    };
    page.querySelector("[data-reset]").onclick = () => { clearInterval(timerId); timerId = null; remaining = 1500; drawTimer(); start.textContent = "Start"; status.textContent = "Timer reset."; };
    page.querySelector("[data-focus]").onclick = event => { document.body.classList.toggle("arc-focus-mode"); event.currentTarget.textContent = document.body.classList.contains("arc-focus-mode") ? "Exit focus" : "Focus mode"; };
    updateClock(); drawTimer(); setInterval(updateClock, 1000);
    return page;
}
