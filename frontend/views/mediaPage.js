import TopBar from "../components/topbar.js";
import Dock from "../components/dock.js";
import MediaDrawer from "../components/mediaDrawer.js";
import VolumeControl from "../components/volumeControl.js";
import { loadMedia } from "../js/media.js";

export default function MediaPage() {
    const page = document.createElement('div');
    page.className = 'media page';

    document.getElementById('topbar').replaceChildren(TopBar());
    document.getElementById('dock').replaceChildren(Dock());

    const header = document.createElement('h2');
    header.textContent = 'Media';
    page.appendChild(header);

    const drawer = MediaDrawer();
    page.appendChild(drawer);
    page.appendChild(VolumeControl());

    loadMedia();

    return page;
}
