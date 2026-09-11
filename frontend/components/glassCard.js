// Markup for a percentage stat with a color-coded fill bar underneath, shared
// by the home dashboard and the stats page so a bare "42%" always has context.
export function statGaugeMarkup(id) {
    return "<h2 id='" + id + "'>0%</h2>" +
        "<span class='stat-bar'><span class='stat-bar-fill' id='" + id + "-bar'></span></span>";
}

// level: <60 ok, 60-85 warn, >85 critical.
export function paintStatGauge(id, value) {
    const bar = document.getElementById(id + "-bar");

    if (!bar)
        return;

    const pct = Math.max(0, Math.min(100, Number(value) || 0));

    bar.style.width = pct + "%";
    bar.classList.toggle("stat-bar-warn", pct >= 60 && pct < 85);
    bar.classList.toggle("stat-bar-critical", pct >= 85);
}

export default function GlassCard(options = {})
{

const card =
document.createElement("div");


card.className =
"glass card module";


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