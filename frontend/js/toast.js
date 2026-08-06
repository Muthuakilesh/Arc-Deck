export function toast(message)
{


const container =
document.getElementById(
"toast-container"
);



const item =
document.createElement(
"div"
);



item.className =
"glass card";


item.textContent =
message;



container.appendChild(
item
);



setTimeout(()=>{


item.remove();


},3000);



}