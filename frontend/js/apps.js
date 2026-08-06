import {
get,
post
}
from "./api.js";



import state from "./state.js";





export async function loadApps()
{


const apps =
await get(
"/apps"
);



state.apps =
Array.isArray(apps) ? apps : [];


return state.apps;


}





export async function launchApp(name)
{


    return await post(
        "/apps/open",
        {
            name:name
        }
    );


}

export async function runAppAction(name, action)
{
    return await post(
        "/apps/action",
        {
            name,
            action
        }
    );
}
