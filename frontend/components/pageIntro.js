import { iconMarkup } from "./icon.js";

export default function PageIntro({ eyebrow, title, icon, meta }) {
    const header = document.createElement("header");

    header.className = "page-intro";
    header.innerHTML = "<div class='page-intro-copy'><p class='eyebrow'>" + eyebrow + "</p><h1>" + title + "</h1></div>" +
        "<div class='page-intro-mark' aria-hidden='true'>" + iconMarkup(icon, { size: 24 }) + "</div>" +
        (meta ? "<p class='page-intro-meta'>" + meta + "</p>" : "");

    return header;
}