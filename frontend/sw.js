/*
 * Bump CACHE on every frontend change: the old worker served whatever it had
 * cached first, so a stale index.html could pin the phone to old modules with
 * no way to clear it short of deleting site data.
 */
const CACHE = "arcdeck-v11";

const SHELL = [
    "./",
    "./index.html",
    "./manifest.json",
    "./vendor/socket.io.min.js",
    "./js/main.js",
    "./css/variables.css",
    "./css/reset.css",
    "./css/layout.css",
    "./css/components.css",
    "./css/animations.css",
    "./css/themes.css"
];


self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE)
            .then(cache => cache.addAll(SHELL))
            .then(() => self.skipWaiting())
    );
});


self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys()
            .then(names => Promise.all(
                names.filter(name => name !== CACHE).map(name => caches.delete(name))
            ))
            .then(() => self.clients.claim())
    );
});


self.addEventListener("fetch", event => {
    const url = new URL(event.request.url);

    // The whole point of the app is live PC state; never serve it from a cache.
    const live = url.pathname.indexOf("/api/") === 0
        || url.pathname.indexOf("/socket.io/") === 0;

    if (live || event.request.method !== "GET")
        return;

    // Network first so a reload always picks up a new build; the cache is the
    // offline/flaky-wifi fallback and is refreshed on every successful fetch.
    event.respondWith(
        fetch(event.request)
            .then(response => {
                const copy = response.clone();

                caches.open(CACHE).then(cache => cache.put(event.request, copy));

                return response;
            })
            .catch(() => caches.match(event.request))
    );
});
