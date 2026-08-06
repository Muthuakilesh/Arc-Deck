import TopBar from "../components/topbar.js";
import Dock from "../components/dock.js";
import GlassCard from "../components/glassCard.js";
import { on } from "../js/events.js";

export default function StatsPage() {
    const page = document.createElement('div');
    page.className = 'stats page';

    document.getElementById('topbar').replaceChildren(TopBar());
    document.getElementById('dock').replaceChildren(Dock());

    const header = document.createElement('h2');
    header.textContent = 'System Stats';
    page.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'widgets';

    const cpu = GlassCard({ title: 'CPU', content: "<h2 id='cpu'>0%</h2>" });
    const ram = GlassCard({ title: 'RAM', content: "<h2 id='ram'>0%</h2>" });
    const disk = GlassCard({ title: 'Disk', content: "<h2 id='disk'>0%</h2>" });
    const ip = GlassCard({ title: 'IP', content: "<div id='ip'>—</div>" });
    const uptime = GlassCard({ title: 'Uptime (s)', content: "<div id='uptime'>0</div>" });
    const gpu = GlassCard({ title: 'GPU', content: "<div id='gpu'>No GPU data</div>" });

    grid.append(cpu, ram, disk, ip, uptime, gpu);
    page.appendChild(grid);

    on('system:update', data => {
        const cpuEl = document.getElementById('cpu');
        const ramEl = document.getElementById('ram');
        const diskEl = document.getElementById('disk');
        const ipEl = document.getElementById('ip');
        const uptimeEl = document.getElementById('uptime');
        const gpuEl = document.getElementById('gpu');
        if (cpuEl) cpuEl.textContent = `${data.cpu}%`;
        if (ramEl) ramEl.textContent = `${data.ram}%`;
        if (diskEl && data.disk !== undefined) diskEl.textContent = `${data.disk}%`;
        if (ipEl) ipEl.textContent = data.ip || '—';
        if (uptimeEl && data.uptime !== undefined) uptimeEl.textContent = data.uptime;
        if (gpuEl) {
            if (Array.isArray(data.gpus) && data.gpus.length) {
                const gpuInfo = data.gpus[0];
                const temp = gpuInfo.temperature ? ` · ${gpuInfo.temperature}°C` : '';
                gpuEl.textContent = `${gpuInfo.name} · ${gpuInfo.load}% · ${gpuInfo.memoryUsed}/${gpuInfo.memoryTotal}MB${temp}`;
            } else {
                gpuEl.textContent = 'No GPU data';
            }
        }
    });

    return page;
}
