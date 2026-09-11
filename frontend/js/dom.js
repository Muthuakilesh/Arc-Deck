// Safari 12 (the newest an iPhone 5s runs) has no Element.replaceChildren.
export function mount(target, node) {
    if (!target)
        return null;

    while (target.firstChild)
        target.removeChild(target.firstChild);

    if (node)
        target.appendChild(node);

    return target;
}
