import state from "./state.js";

const STORAGE_KEY = "arcdeck.theme";

// Each entry is a `[data-theme]` block in css/themes.css.
export const THEMES = [
    { id: "aurora", label: "Aurora", swatch: "#3ddcff" },
    { id: "ember", label: "Ember", swatch: "#ffb648" },
    { id: "nova", label: "Nova", swatch: "#b98cff" },
    { id: "mint", label: "Mint", swatch: "#6ff2b6" }
];


function isKnown(id) {
    return THEMES.some(theme => theme.id === id);
}


export function currentTheme() {
    return state.theme;
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


export function initTheme() {
    let saved = null;

    try {
        saved = localStorage.getItem(STORAGE_KEY);
    } catch (error) {
        saved = null;
    }

    return applyTheme(saved);
}
