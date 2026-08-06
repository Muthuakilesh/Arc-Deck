import {
get,
post
}
from "./api.js";


import state from "./state.js";

import {
emit
}
from "./events.js";



export async function syncVolume()
{


const data =
await get(
"/audio"
);



if(!data)
return;



state.volume=data;


emit(
"volume:update",
data
);

return data;


}



export async function changeVolume(value)
{


const data =
await post(
"/audio/volume",
{
value
}
);



state.volume=data;



emit(
"volume:update",
data
);

return data;


}



export async function toggleMute()
{
    const data = await post(
        "/audio/mute",
        {}
    );
    if (!data) return null;

    state.volume = data;
    emit("volume:update", data);
    return data;
}
