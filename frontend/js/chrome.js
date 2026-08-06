import TopBar from "../components/topbar.js";
import Dock from "../components/dock.js";

import { mount } from "./dom.js";


// Every view rebuilds the bars around itself; this is that shared step.
export default function mountChrome() {
    mount(document.getElementById("topbar"), TopBar());
    mount(document.getElementById("dock"), Dock());
}
