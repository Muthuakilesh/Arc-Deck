import { get, post, getToken, setToken, setUnauthorizedHandler } from "./api.js";

import { emit } from "./events.js";

let pending = null;


function buildScreen(resolve) {
    const screen = document.createElement("div");
    screen.className = "pin-screen";
    screen.innerHTML = `
        <form class="pin-card glass card" novalidate>
            <p class="eyebrow">PAIR THIS PHONE</p>
            <h1>ArcDeck</h1>
            <p class="pin-hint">Enter the PIN shown in the ArcDeck window on your PC.</p>
            <input class="pin-input" type="tel" inputmode="numeric" autocomplete="one-time-code"
                maxlength="8" placeholder="0000" aria-label="Pairing PIN">
            <button class="pin-submit" type="submit">Unlock</button>
            <p class="pin-error" role="alert"></p>
        </form>`;

    const form = screen.querySelector("form");
    const input = screen.querySelector(".pin-input");
    const submit = screen.querySelector(".pin-submit");
    const error = screen.querySelector(".pin-error");

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const pin = input.value.trim();

        if (!pin) {
            error.textContent = "Enter the PIN first.";
            return;
        }

        submit.disabled = true;
        error.textContent = "";

        const data = await post("/auth/login", { pin: pin });
        submit.disabled = false;

        if (data && data.token) {
            setToken(data.token);
            screen.parentNode.removeChild(screen);
            resolve();
            return;
        }

        input.value = "";
        error.textContent = (data && data.error) || "Incorrect PIN";
    });

    return { screen: screen, input: input };
}


function promptForPin() {
    if (pending)
        return pending;

    pending = new Promise(resolve => {
        const parts = buildScreen(() => {
            pending = null;
            resolve();

            // Already-mounted cards hold values from before the token expired.
            emit("auth:paired", true);
        });

        document.body.appendChild(parts.screen);
        parts.input.focus();
    });

    return pending;
}


export async function ensureAuthenticated() {
    if (getToken()) {
        const session = await get("/auth/session");

        if (session && session.authenticated)
            return;
    }

    setToken("");
    await promptForPin();
}


// A restarted PC (or a revoked token) should drop straight back to the PIN screen.
setUnauthorizedHandler(() => {
    promptForPin();
});
