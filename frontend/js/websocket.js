import {
emit
}
from "./events.js";



let socket;



export function connectSocket()
{


socket =
io();



socket.on(
"connect",
()=>{


emit(
"connection",
true
);


}
);



socket.on(
"disconnect",
()=>{


emit(
"connection",
false
);


}
);



socket.on(
"system_update",
data=>{


emit(
"system:update",
data
);


}
);



}