import {get} from "./api.js";

import state from "./state.js";

import {emit} from "./events.js";



export async function updateSystem()
{


const data =
await get(
"/system"
);



if(!data)
return;



state.system =
data;



state.connected =
true;



emit(
"system:update",
data
);


}




export function startSystemMonitor()
{


updateSystem();



setInterval(
updateSystem,
2000
);


}