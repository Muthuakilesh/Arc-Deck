export default function HeroCard()
{


const hero =
document.createElement("div");


hero.className =
"glass card module module-hero hero";



hero.innerHTML = `

<div class="hero-content">


<h1>
Welcome Back
</h1>


<p>
Your command center is ready.
</p>

</div>


`;



return hero;


}