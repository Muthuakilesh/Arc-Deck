// The Flask app normally serves the UI and API together on port 5000. When
// the optional static server is used (port 8000), send phone requests back to
// the Flask server on the same computer instead of the static server.
const API = window.location.port && window.location.port !== "5000"
    ? `${window.location.protocol}//${window.location.hostname}:5000/api`
    : "/api";

const TOKEN_KEY = "arcdeck.token";
const TOKEN_HEADER = "X-ArcDeck-Token";

let token = readStoredToken();
let onUnauthorized = null;


function readStoredToken() {
    try {
        return window.localStorage.getItem(TOKEN_KEY) || "";
    } catch (error) {
        // Private browsing can block storage; the session then lasts until reload.
        return "";
    }
}

export function getToken() {
    return token;
}

export function setToken(value) {
    token = value || "";

    try {
        if (token)
            window.localStorage.setItem(TOKEN_KEY, token);
        else
            window.localStorage.removeItem(TOKEN_KEY);
    } catch (error) {
        // ignore storage failures, keep the in-memory token
    }
}

export function setUnauthorizedHandler(handler) {
    onUnauthorized = handler;
}


async function request(endpoint, options) {
    const settings = options || {};
    const headers = Object.assign({}, settings.headers);

    if (token)
        headers[TOKEN_HEADER] = token;

    try {
        const response = await fetch(`${API}${endpoint}`, Object.assign({}, settings, { headers }));
        const data = await response.json().catch(() => null);

        if (response.status === 401) {
            setToken("");

            if (onUnauthorized)
                onUnauthorized();

            return { error: (data && data.error) || "PIN required", unauthorized: true };
        }

        if (!response.ok) {
            const message = (data && data.error) || `Request failed (${response.status})`;
            console.error("API error", endpoint, message);
            return { error: message };
        }

        return data;
    } catch (error) {
        console.error("API error", endpoint, error);
        return { error: "Cannot reach your PC" };
    }
}


export function get(endpoint) {
    return request(endpoint);
}


export function post(endpoint, data) {
    return request(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data || {})
    });
}


export function del(endpoint) {
    return request(endpoint, { method: "DELETE" });
}
