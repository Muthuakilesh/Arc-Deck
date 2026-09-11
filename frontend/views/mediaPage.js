import mountChrome from "../js/chrome.js";
import MediaDrawer from "../components/mediaDrawer.js";
import Mixer from "../components/mixer.js";
import VolumeControl from "../components/volumeControl.js";
import PageIntro from "../components/pageIntro.js";
import { loadMedia } from "../js/media.js";

export default function MediaPage() {
    const page = document.createElement('div');
    page.className = 'media page ios-modular-page';

    mountChrome();


    const header = PageIntro({ eyebrow: 'NOW PLAYING', title: 'Media room', icon: 'media', meta: 'Playback / audio' });
    page.appendChild(header);

    const modules = document.createElement('div');
    modules.className = 'module-grid module-grid-media';

    const drawer = MediaDrawer();
    modules.appendChild(drawer);
    modules.appendChild(VolumeControl());
    modules.appendChild(Mixer());
    page.appendChild(modules);

    loadMedia();

    return page;
}
