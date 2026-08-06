export function startClock()
{


const element =
document.getElementById(
"clock"
);



setInterval(()=>{


if(element)
{

element.textContent =
new Date()
.toLocaleTimeString();

}


},1000);


}