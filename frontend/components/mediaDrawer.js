import {
mediaAction
}
from "../js/media.js";



export default function MediaDrawer()
{


const drawer =
document.createElement(
"div"
);


drawer.className =
"glass card media-drawer";



drawer.innerHTML=`

<h2>
Media
</h2>


<div id="track">

No Media

</div>


<div class="controls">


<button id="prev" class="control-button">
⏮
</button>


<button id="play" class="control-button play-button">
▶
</button>


<button id="next" class="control-button">
⏭
</button>


<button id="mute" class="control-button mute-button">
🔇
</button>


</div>

`;



drawer
.querySelector("#play")
.onclick=()=>{

mediaAction(
"play"
);

};



drawer
.querySelector("#next")
.onclick=()=>{

mediaAction(
"next"
);

};


drawer
.querySelector("#mute")
.onclick=()=>{

mediaAction(
"mute"
);

};


drawer.querySelector("#prev")
.onclick=()=>{

mediaAction(
"previous"
);

};



return drawer;


}