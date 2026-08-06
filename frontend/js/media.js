import {
get,
post
}
from "./api.js";


import {
emit
}
from "./events.js";



export async function loadMedia()
{

const data =
await get(
"/media"
);


emit(
"media:update",
data
);


return data;

}



export async function mediaAction(action)
{

return await post(
"/media/action",
{
action
}
);

}