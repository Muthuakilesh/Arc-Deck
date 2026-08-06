export default function GlassCard(options = {})
{

const card =
document.createElement("div");


card.className =
"glass card";


if(options.title)
{

const title =
document.createElement("h3");

title.textContent =
options.title;


card.appendChild(title);

}


if(options.content)
{

const content =
document.createElement("div");


content.innerHTML =
options.content;


card.appendChild(content);

}


return card;

}