import { get, post } from "./api.js";

import { emit } from "./events.js";


export async function loadMedia() {
    const data = await get("/media");

    if (data && !data.error)
        emit("media:update", data);

    return data;
}


export async function mediaAction(action) {
    return post("/media/action", { action: action });
}
