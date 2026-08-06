import router from "../js/router.js";

export default function Dock()
{
    const dock = document.createElement("div");
    dock.className = "glass card dock";

    const buttons = [
        { icon: "🏠", page: "home", label: "Home" },
        { icon: "📁", page: "apps", label: "Apps" },
        { icon: "🎮", page: "games", label: "Games" },
        { icon: "🎵", page: "media", label: "Media" },
        { icon: "🖱️", page: "control", label: "Control" },
        { icon: "📊", page: "stats", label: "Stats" },
        { icon: "◷", page: "clock", label: "Clock" }
    ];

    buttons.forEach(item => {
        const button = document.createElement("button");
        button.className = "dock-item";
        button.dataset.page = item.page;
        button.textContent = item.icon;
        button.title = item.label;

        button.onclick = () => {
            router.navigate(item.page);
        };

        dock.appendChild(button);
    });

    return dock;
}
