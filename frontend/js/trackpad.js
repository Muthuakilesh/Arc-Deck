import { post } from "./api.js";
import { sendMouse } from "./websocket.js";


const SENSITIVITY_KEY = "arcdeck.sensitivity";

let sensitivity = readSensitivity();


function readSensitivity() {
    try {
        const stored = parseFloat(window.localStorage.getItem(SENSITIVITY_KEY));
        return stored > 0 ? stored : 1.6;
    } catch (error) {
        return 1.6;
    }
}


export function getSensitivity() {
    return sensitivity;
}


export function setSensitivity(value) {
    sensitivity = value;

    try {
        window.localStorage.setItem(SENSITIVITY_KEY, String(value));
    } catch (error) {
        // Private browsing blocks storage; the setting lasts until reload.
    }
}


export function move(x, y) {
    const payload = { x: x * sensitivity, y: y * sensitivity };

    if (sendMouse(payload))
        return Promise.resolve(null);

    return post("/mouse/move", payload);
}


export function click(button) {
    return post("/mouse/click", { button: button });
}


export function press(button, down) {
    return post("/mouse/press", { button: button, down: down });
}


export function scroll(amount) {
    const payload = { type: "scroll", amount: amount };

    if (sendMouse(payload))
        return Promise.resolve(null);

    return post("/mouse/scroll", { amount: amount });
}
