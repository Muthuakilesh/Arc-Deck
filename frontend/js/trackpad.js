import {
post
}
from "./api.js";



let sensitivity = 1;



export function setSensitivity(value)
{

sensitivity=value;

}




export function move(x,y)
{


return post(
"/mouse/move",
{

x:
x*sensitivity,


y:
y*sensitivity

}

);

}




export function click(button)
{


return post(
"/mouse/click",
{
button
}
);

}




export function scroll(amount)
{


return post(
"/mouse/scroll",
{
amount
}
);

}