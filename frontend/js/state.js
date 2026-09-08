const state = {


page:
"home",



theme:
"default",



wallpaper:
null,



connected:
false,



volume:
{
volume:0,
muted:false
},



system:
{

cpu:0,

ram:0,

gpu:0

},



apps:[],



foreground:
null,



sessions:[],



scenes:[]

,sceneRun:null

,favorites:[]

,recents:[]

,clipboard:
{
	enabled:false,
	available:false,
	text:"",
	version:0
}



};



export default state;