import {
mediaAction
}
from "../js/media.js";
import { loadMedia } from "../js/media.js";
import { off, on } from "../js/events.js";
import { iconMarkup } from "./icon.js";



export default function MediaDrawer()
{


const drawer =
document.createElement(
"div"
);


drawer.className =
"glass card module module-media media-drawer";



drawer.innerHTML=`

<h2>
Media
</h2>


<div id="track">

No Media

</div>

<p id="media-state" class="media-state">Checking playback</p>


<div class="controls">


<button id="prev" class="control-button" aria-label="Previous track">
${iconMarkup("prev", { size: 18 })}
</button>


<button id="play" class="control-button play-button" aria-label="Play or pause">
${iconMarkup("play", { size: 18 })}
</button>


<button id="next" class="control-button" aria-label="Next track">
${iconMarkup("next", { size: 18 })}
</button>


<button id="mute" class="control-button mute-button" aria-label="Mute or unmute">
${iconMarkup("volume-mute", { size: 18 })}
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

const track = drawer.querySelector("#track");
const mediaState = drawer.querySelector("#media-state");
let pollTimer = 0;

function paintMedia(data) {
	if (!data || data.error)
		return;

	const title = data.title && data.title !== "No media detected" ? data.title : "No active media";
	track.textContent = data.artist ? title + " - " + data.artist : title;
	mediaState.textContent = data.playing ? "Playing" : "Ready for playback";
}

function poll() {
	if (!drawer.parentNode) {
		off("media:update", paintMedia);
		return;
	}

	loadMedia().then(paintMedia);
	pollTimer = window.setTimeout(poll, 5000);
}

on("media:update", paintMedia);
poll();



return drawer;


}