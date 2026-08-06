import {
on
}
from "../js/events.js";

export default function TopBar()
{


const bar =
document.createElement("div");


bar.className =
"glass card topbar";


bar.innerHTML = `

<div class="brand">

<span class="logo">
◈
</span>

<span>
ArcDeck
</span>

</div>


<div class="status">

<span class="online-dot"></span>

<span id="connection">
Connecting...
</span>

<span id="clock">
00:00:00
</span>

</div>

`;

setTimeout(()=>{


on(
"connection",
status=>{


const text =
document.getElementById(
"connection"
);



if(text)
{

text.textContent =
status
?
"Connected"
:
"Offline";


}



});


},0);

return bar;


}