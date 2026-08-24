import state from "./state.js";

const STORAGE_KEY = "arcdeck.theme";
const STYLE_KEY = "arcdeck.uiStyle";

// Each entry is a `[data-theme]` block in css/themes.css.
export const THEMES = [
    { id: "aurora", label: "Aurora", swatch: "#3ddcff" },
    { id: "ember", label: "Ember", swatch: "#ffb648" },
    { id: "nova", label: "Nova", swatch: "#b98cff" },
    { id: "mint", label: "Mint", swatch: "#6ff2b6" }
];

export const UI_STYLES = [
    { id: "neon-cyber", label: "Neon Cyber" },
    { id: "soft-comfort", label: "Soft Comfort" },
    { id: "minimal-pro", label: "Minimal Pro" }
];


function isKnown(id) {
    return THEMES.some(theme => theme.id === id);
}


function isKnownStyle(id) {
    return UI_STYLES.some(style => style.id === id);
}


export function currentTheme() {
    return state.theme;
}


export function currentUiStyle() {
    return state.uiStyle;
}


export function applyTheme(id) {
    const name = isKnown(id) ? id : THEMES[0].id;

    document.documentElement.setAttribute("data-theme", name);
    state.theme = name;

    try {
        localStorage.setItem(STORAGE_KEY, name);
    } catch (error) {
        // Private mode on iOS throws on write; the theme just won't persist.
    }

    return name;
}


export function applyUiStyle(id) {
    const name = isKnownStyle(id) ? id : UI_STYLES[0].id;

    document.documentElement.setAttribute("data-ui-style", name);
    state.uiStyle = name;

    try {
        localStorage.setItem(STYLE_KEY, name);
    } catch (error) {
        // Private mode on iOS throws on write; style just won't persist.
    }

    return name;
}


export function initTheme() {
    let saved = null;

    try {
        saved = localStorage.getItem(STORAGE_KEY);
    } catch (error) {
        saved = null;
    }

    return applyTheme(saved);
}


export function initUiStyle() {
    let saved = null;

    try {
        saved = localStorage.getItem(STYLE_KEY);
    } catch (error) {
        saved = null;
    }

    return applyUiStyle(saved);
}
