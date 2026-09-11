import { get, post } from "./api.js";

import { emit } from "./events.js";


export async function loadMedia() {
    const data = await get("/media");

    if (data && !data.error)
        emit("media:update", data);

    return data;
}


export async function mediaAction(action, position) {
    const payload = { action: action };

    if (position !== undefined)
        payload.position = position;

    return post("/media/action", payload);
}
