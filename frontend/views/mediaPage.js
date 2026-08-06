import mountChrome from "../js/chrome.js";
import MediaDrawer from "../components/mediaDrawer.js";
import Mixer from "../components/mixer.js";
import VolumeControl from "../components/volumeControl.js";
import { loadMedia } from "../js/media.js";

export default function MediaPage() {
    const page = document.createElement('div');
    page.className = 'media page';

    mountChrome();


    const header = document.createElement('h2');
    header.textContent = 'Media';
    page.appendChild(header);

    const drawer = MediaDrawer();
    page.appendChild(drawer);
    page.appendChild(VolumeControl());
    page.appendChild(Mixer());

    loadMedia();

    return page;
}
