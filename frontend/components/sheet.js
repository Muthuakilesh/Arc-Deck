// Bottom sheets sit above the dock rather than over it, so the dock button that
// opened one can always close it again.
export function closeSheet() {
    const open = document.querySelectorAll(".sheet, .sheet-backdrop");

    for (let index = 0; index < open.length; index += 1)
        open[index].parentNode.removeChild(open[index]);
}


export function sheetIsOpen() {
    return document.querySelector(".sheet") !== null;
}


export function sheetTitle(text) {
    const title = document.createElement("p");

    title.className = "eyebrow sheet-title";
    title.textContent = text;

    return title;
}


export function showSheet(children) {
    closeSheet();

    const backdrop = document.createElement("div");
    backdrop.className = "sheet-backdrop";
    backdrop.onclick = closeSheet;

    const sheet = document.createElement("div");
    sheet.className = "sheet glass card";

    children.forEach(child => sheet.appendChild(child));

    const root = document.getElementById("arcdeck");
    root.appendChild(backdrop);
    root.appendChild(sheet);

    return sheet;
}
