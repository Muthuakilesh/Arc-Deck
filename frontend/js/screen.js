import { getToken, post } from "./api.js";


const BASE = window.location.port && window.location.port !== "5000"
    ? window.location.protocol + "//" + window.location.hostname + ":5000/api"
    : "/api";


// An <img src> cannot carry the pairing token, so the frame is fetched like any
// other API call and handed to the image as an object URL.
export function fetchFrame(width, quality) {
    const url = BASE + "/screen?w=" + width + "&q=" + quality + "&t=" + Date.now();
    const headers = {};
    const token = getToken();

    if (token)
        headers["X-ArcDeck-Token"] = token;

    return fetch(url, { headers: headers }).then(response => {
        if (!response.ok) {
            return response.json()
                .catch(() => null)
                .then(body => {
                    throw new Error((body && body.error) || "Screen unavailable");
                });
        }

        return response.blob();
    });
}


export function tapScreen(x, y, button) {
    return post("/screen/tap", { x: x, y: y, button: button || "left" });
}
