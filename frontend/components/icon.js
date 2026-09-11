// Small hand-drawn line-icon set (24x24, stroke=currentColor) that replaces the
// Unicode glyphs the shell used to render, so icons scale and recolor cleanly.
const PATHS = {
    home: '<path d="M3 11.2 12 4l9 7.2"/><path d="M5.5 10v9a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-9"/><path d="M9.5 20v-6h5v6"/>',
    apps: '<rect x="4" y="4" width="7" height="7" rx="1.6"/><rect x="13" y="4" width="7" height="7" rx="1.6"/><rect x="4" y="13" width="7" height="7" rx="1.6"/><rect x="13" y="13" width="7" height="7" rx="1.6"/>',
    media: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
    control: '<circle cx="12" cy="12" r="7"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
    more: '<circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/>',
    scenes: '<path d="M13 2 4 14h6l-1 8 9-12h-6z" fill="currentColor" stroke="none"/>',
    games: '<path d="M12 3l2.4 5.6L20 10l-4.6 3.8L16.8 20 12 16.6 7.2 20l1.4-6.2L4 10l5.6-1.4z"/>',
    gamepad: '<path d="M7 8h10a4 4 0 0 1 4 4l1 4a2 2 0 0 1-3.5 1.6L16.5 15h-9L5 17.6A2 2 0 0 1 1.5 16l1-4a4 4 0 0 1 4-4z"/><path d="M7.5 11v3M6 12.5h3"/><circle cx="16" cy="11" r="1" fill="currentColor" stroke="none"/><circle cx="18.2" cy="13.2" r="1" fill="currentColor" stroke="none"/>',
    screen: '<rect x="3" y="4" width="18" height="12" rx="1.6"/><path d="M8 20h8M12 16v4"/>',
    stats: '<rect x="4" y="12" width="3" height="8" rx="1"/><rect x="10.5" y="7" width="3" height="13" rx="1"/><rect x="17" y="3" width="3" height="17" rx="1"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    brand: '<path d="M12 2 22 12 12 22 2 12z"/>',
    app: '<rect x="4" y="4" width="16" height="16" rx="5"/>',
    play: '<path d="M7 4.5v15l13-7.5z" fill="currentColor" stroke="none"/>',
    pause: '<rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none"/>',
    next: '<path d="M6 5v14l10-7z" fill="currentColor" stroke="none"/><rect x="17" y="5" width="2.4" height="14" rx="1" fill="currentColor" stroke="none"/>',
    prev: '<path d="M18 5v14L8 12z" fill="currentColor" stroke="none"/><rect x="4.6" y="5" width="2.4" height="14" rx="1" fill="currentColor" stroke="none"/>',
    "volume-up": '<path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor" stroke="none"/><path d="M16.5 9a4.5 4.5 0 0 1 0 6M19 6.5a8.5 8.5 0 0 1 0 11"/>',
    "volume-mute": '<path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor" stroke="none"/><path d="M16 9l5 6M21 9l-5 6"/>',
    edit: '<path d="M4 20h4l10.5-10.5a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16z"/><path d="M13.5 6.5l4 4"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    star: '<path d="M12 3l2.4 5.6L20 10l-4.6 3.8L16.8 20 12 16.6 7.2 20l1.4-6.2L4 10l5.6-1.4z"/>',
    restart: '<path d="M4 12a8 8 0 1 1 2.6 5.9"/><path d="M4 17v-5h5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>',
    wifi: '<path d="M3 9a14 14 0 0 1 18 0M6 12a9 9 0 0 1 12 0M9.5 15.5a4 4 0 0 1 5 0"/><circle cx="12" cy="19" r="1" fill="currentColor" stroke="none"/>',
    bluetooth: '<path d="m12 3 5 4.5-10 9L12 21V3zM7 7.5 17 16.5"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.12 2.12-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.04 1.56v.08h-3v-.08a1.7 1.7 0 0 0-1.04-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-2.12-2.12.06-.06A1.7 1.7 0 0 0 7 15a1.7 1.7 0 0 0-1.56-1.04h-.08v-3h.08A1.7 1.7 0 0 0 7 9.92a1.7 1.7 0 0 0-.34-1.88L6.6 8 8.72 5.88l.06.06A1.7 1.7 0 0 0 10.66 6.3a1.7 1.7 0 0 0 1.04-1.56v-.08h3v.08A1.7 1.7 0 0 0 15.74 6.3a1.7 1.7 0 0 0 1.88-.34l.06-.06L19.8 8l-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.56 1.04h.08v3h-.08A1.7 1.7 0 0 0 19.4 15z"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>',
    landscape: '<rect x="3" y="7" width="18" height="10" rx="2"/><path d="M12 4V2M12 22v-2"/>'
    ,"chevron-up": '<path d="m6 14 6-6 6 6"/>'
    ,"chevron-down": '<path d="m6 10 6 6 6-6"/>'
};

const NAMES = Object.keys(PATHS);
const parser = new DOMParser();

function markup(name, size, strokeWidth) {
    const inner = PATHS[name] || PATHS.app;

    return "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"" + size + "\" height=\"" + size +
        "\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"" + strokeWidth +
        "\" stroke-linecap=\"round\" stroke-linejoin=\"round\">" + inner + "</svg>";
}

// Returns the raw <svg> markup, for template literals (innerHTML) callers.
export function iconMarkup(name, opts = {}) {
    return markup(name, opts.size || 20, opts.strokeWidth || 1.8);
}

// Returns a live SVGElement, for callers building the DOM by hand.
export function icon(name, opts = {}) {
    const doc = parser.parseFromString(markup(name, opts.size || 20, opts.strokeWidth || 1.8), "image/svg+xml");
    const node = doc.documentElement;

    node.setAttribute("aria-hidden", "true");

    if (opts.className)
        node.setAttribute("class", opts.className);

    return node;
}

export function hasIcon(name) {
    return NAMES.indexOf(name) !== -1;
}
