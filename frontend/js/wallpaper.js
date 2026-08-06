import {loadTheme} from "./theme.js";



export async function loadWallpaper()
{


const theme =
await loadTheme(
"elden-ring"
);



const layer =
document.getElementById(
"wallpaper-layer"
);



layer.style.backgroundImage =
`
url(
'./images/wallpapers/${theme.wallpaper}'
)
`;



}



export function changeWallpaper(themeName)
{

loadTheme(themeName)
.then(theme=>{


document
.getElementById(
"wallpaper-layer"
)
.style.backgroundImage =

`
url(
'./images/wallpapers/${theme.wallpaper}'
)
`;



});


}