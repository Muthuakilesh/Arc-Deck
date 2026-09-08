function greeting() {
    const hour = new Date().getHours();

    if (hour < 5)
        return "Still up";

    if (hour < 12)
        return "Good morning";

    if (hour < 18)
        return "Good afternoon";

    return "Good evening";
}


export default function HeroCard()
{


const hero =
document.createElement("div");


hero.className =
"glass card module module-hero hero";



hero.innerHTML = `

<div class="hero-content">

<div class="hero-kicker"><span class="hero-status-dot"></span>ARCDECK / DESK MODE</div>

<h1>${greeting()}<span>.</span></h1>

<p>Your command center is ready.</p>

<div class="hero-context">
<span>${new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric" }).format(new Date())}</span>
<span class="hero-context-rule"></span>
<span>Controls within reach</span>
</div>

</div>

<div class="hero-mark" aria-hidden="true">
<span></span><span></span><span></span><span></span><span></span>
</div>


`;



return hero;


}