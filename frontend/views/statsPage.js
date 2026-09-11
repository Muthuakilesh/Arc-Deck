import mountChrome from "../js/chrome.js";
import GlassCard, { paintStatGauge, statGaugeMarkup } from "../components/glassCard.js";
import { on } from "../js/events.js";
import PageIntro from "../components/pageIntro.js";

export default function StatsPage() {
    const page = document.createElement('div');
    page.className = 'stats page';

    mountChrome();


    const header = PageIntro({ eyebrow: 'SYSTEM HEALTH', title: 'Telemetry', icon: 'stats', meta: 'Live performance' });
    page.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'widgets';

    const cpu = GlassCard({ title: 'CPU', content: statGaugeMarkup('cpu') });
    const ram = GlassCard({ title: 'RAM', content: statGaugeMarkup('ram') });
    const disk = GlassCard({ title: 'Disk', content: statGaugeMarkup('disk') });
    const ip = GlassCard({ title: 'IP', content: "<div id='ip'>—</div>" });
    const uptime = GlassCard({ title: 'Uptime (s)', content: "<div id='uptime'>0</div>" });
    const gpu = GlassCard({ title: 'GPU', content: "<div id='gpu'>No GPU data</div>" });

    cpu.classList.add('stat-primary', 'stat-cpu');
    ram.classList.add('stat-primary', 'stat-ram');
    disk.classList.add('stat-primary', 'stat-disk');
    ip.classList.add('stat-detail');
    uptime.classList.add('stat-detail');
    gpu.classList.add('stat-detail', 'stat-gpu');

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
        paintStatGauge('cpu', data.cpu);
        paintStatGauge('ram', data.ram);
        if (data.disk !== undefined) paintStatGauge('disk', data.disk);
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
