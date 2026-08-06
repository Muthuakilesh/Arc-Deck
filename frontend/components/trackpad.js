import {
move,
click,
scroll
}
from "../js/trackpad.js";




export default function Trackpad()
{


const pad =
document.createElement(
"div"
);



pad.className =
"glass trackpad";



pad.innerHTML=`

<h3>
Trackpad
</h3>


<div class="surface">

Touch Here

</div>


<div class="buttons">

<button id="left">
Left
</button>


<button id="right">
Right
</button>

</div>

`;



const surface =
pad.querySelector(
".surface"
);



let lastX=0;

let lastY=0;



surface.addEventListener(
"touchstart",
e=>{


const touch =
e.touches[0];


lastX =
touch.clientX;


lastY =
touch.clientY;


});




surface.addEventListener(
"touchmove",
e=>{


e.preventDefault();


const touch =
e.touches[0];


const dx =
touch.clientX-lastX;


const dy =
touch.clientY-lastY;



move(
dx,
dy
);



lastX =
touch.clientX;


lastY =
touch.clientY;



},
{
passive:false
}
);





pad
.querySelector("#left")
.onclick=()=>{

click(
"left"
);

};



pad
.querySelector("#right")
.onclick=()=>{

click(
"right"
);

};



return pad;

}