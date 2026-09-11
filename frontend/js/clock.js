// Hours and minutes only: seconds don't fit next to the status text at 320px.
function render() {
    const element = document.getElementById("clock");

    if (element)
        element.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}


export function startClock() {
    render();
    setInterval(render, 15000);
}
