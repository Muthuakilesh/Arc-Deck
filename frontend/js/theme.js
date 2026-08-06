import state from "./state.js";



export async function loadTheme(name="default")
{


const response =
await fetch(
`./themes/${name}.json`
);



const theme =
await response.json();



state.theme =
theme.name;



applyTheme(theme);



return theme;


}




function applyTheme(theme)
{


const root =
document.documentElement;



root.style.setProperty(
"--primary",
theme.colors.primary
);



root.style.setProperty(
"--accent",
theme.colors.accent
);



root.style.setProperty(
"--background",
theme.colors.background
);



if(theme.effects.blur)
{

root.style.setProperty(
"--blur",
`${theme.effects.blur}px`
);

}


}