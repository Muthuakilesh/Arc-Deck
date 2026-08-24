import mountChrome from "../js/chrome.js";
import Trackpad from "../components/trackpad.js";
import VolumeControl from "../components/volumeControl.js";
import { post } from "../js/api.js";

export default function ControlPage() {
    const page = document.createElement('div');
    page.className = 'control page ios-modular-page';

    mountChrome();


    const header = document.createElement('h2');
    header.textContent = 'Controls';
    page.appendChild(header);

    const modules = document.createElement('div');
    modules.className = 'module-grid module-grid-control';

    modules.appendChild(createControlHelpCard());
    modules.appendChild(Trackpad());
    modules.appendChild(createKeyboardInput());
    modules.appendChild(createPowerCard());
    modules.appendChild(VolumeControl());
    page.appendChild(modules);

    return page;
}

function createKeyboardInput() {
    const container = document.createElement('div');
    container.className = 'glass card module module-keyboard keyboard-card';

    container.innerHTML = `
<h3>Remote Keyboard</h3>
<textarea id="remote-input" placeholder="Type here to send to your currently focused field..." rows="3"></textarea>
<div class="keyboard-actions">
    <button id="send-keyboard">Send</button>
    <button id="clear-keyboard">Clear</button>
</div>
<p class="keyboard-hint">Tip: Press Ctrl+Enter to send quickly.</p>
<div class="quick-keys" aria-label="Remote shortcut keys">
    <button type="button" data-key="tab">Tab</button>
    <button type="button" data-key="enter">Enter</button>
    <button type="button" data-key="space">Space</button>
    <button type="button" data-key="esc">Esc</button>
</div>
<p id="keyboard-status"></p>
`;

    const textarea = container.querySelector('#remote-input');
    const button = container.querySelector('#send-keyboard');
    const clearBtn = container.querySelector('#clear-keyboard');
    const status = container.querySelector('#keyboard-status');

    textarea.addEventListener('keydown', event => {
        if (!(event.ctrlKey && event.key === 'Enter'))
            return;

        event.preventDefault();
        button.click();
    });

    button.onclick = async () => {
        if (!textarea) return;
        const text = textarea.value.trim();
        if (!text) return;

        const result = await post('/keyboard/type', { text });
        if (result && !result.error) {
            status.textContent = 'Sent to active field.';
            textarea.value = '';
        } else {
            status.textContent = (result && result.error) || 'Failed to send text.';
        }
        setTimeout(() => { status.textContent = ''; }, 2000);
    };

    clearBtn.onclick = () => {
        if (textarea) textarea.value = '';
    };

    container.querySelectorAll('[data-key]').forEach(key => {
        key.onclick = async () => {
            const result = await post('/keyboard/hotkey', { keys: [key.dataset.key] });
            status.textContent = result && !result.error ? `${key.textContent} sent.` : ((result && result.error) || 'Key failed.');
            setTimeout(() => { status.textContent = ''; }, 1600);
        };
    });

    return container;
}

function createControlHelpCard() {
    const container = document.createElement('section');
    container.className = 'glass card module module-help control-help';

    container.innerHTML = `
        <p class="eyebrow">QUICK HELP</p>
        <details>
            <summary>How to use controls efficiently</summary>
            <ul>
                <li>Trackpad: tap for left click, two-finger tap for right click.</li>
                <li>Trackpad: two fingers drag to scroll.</li>
                <li>Trackpad: double-tap and hold to drag windows.</li>
                <li>Keyboard: use Ctrl+Enter to send text quickly.</li>
                <li>Audio: use "Mute focused app" to silence only the active app.</li>
            </ul>
        </details>`;

    return container;
}

function createPowerCard() {
    const container = document.createElement('section');
    container.className = 'glass card module module-power power-card';
    container.innerHTML = `
        <p class="eyebrow">PC POWER</p>
        <h3>Power options</h3>
        <div class="power-actions">
            <button type="button" data-power="sleep">Sleep</button>
            <button type="button" data-power="restart">Restart</button>
            <button type="button" class="danger-button" data-power="shutdown">Shut down</button>
        </div>
        <p class="power-status" aria-live="polite"></p>`;

    const status = container.querySelector('.power-status');
    container.querySelectorAll('[data-power]').forEach(button => {
        button.onclick = async () => {
            const action = button.dataset.power;
            if (!window.confirm(`${action === 'shutdown' ? 'Shut down' : action[0].toUpperCase() + action.slice(1)} this PC?`)) return;
            status.textContent = 'Sending…';
            const result = await post('/system/power', { action });
            status.textContent = result && !result.error ? `PC ${action} command sent.` : ((result && result.error) || 'Command failed.');
        };
    });
    return container;
}
