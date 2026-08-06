import { get, post } from "../js/api.js";
import { toast } from "../js/toast.js";


// A keystroke per request would hammer the PC's disk index; a short pause after
// typing stops is enough to feel instant.
const DEBOUNCE_MS = 220;


export default function AppSearch() {
    const card = document.createElement("div");
    card.className = "glass card app-search";

    const field = document.createElement("input");
    field.type = "search";
    field.className = "search-field";
    field.placeholder = "Search everything on the PC";
    field.autocapitalize = "off";
    field.autocomplete = "off";

    const results = document.createElement("div");
    results.className = "search-results";

    card.appendChild(field);
    card.appendChild(results);

    let timer = 0;
    let latest = 0;

    function show(message) {
        results.innerHTML = "";

        const line = document.createElement("p");
        line.className = "search-empty";
        line.textContent = message;

        results.appendChild(line);
    }

    function render(items) {
        results.innerHTML = "";

        if (!items.length) {
            show("Nothing matched.");
            return;
        }

        items.forEach(item => {
            const button = document.createElement("button");

            button.type = "button";
            button.className = "search-hit";
            button.textContent = item.name;

            button.onclick = () => {
                button.disabled = true;

                post("/apps/search/open", { id: item.id }).then(result => {
                    button.disabled = false;
                    toast(result && result.error ? result.error : "Opening " + item.name);
                });
            };

            results.appendChild(button);
        });
    }

    function run() {
        const query = field.value.trim();

        if (query.length < 2) {
            results.innerHTML = "";
            return;
        }

        const ticket = ++latest;

        get("/apps/search?q=" + encodeURIComponent(query)).then(data => {
            // A slower earlier search must not overwrite a newer one.
            if (ticket !== latest)
                return;

            if (!data || data.error) {
                show((data && data.error) || "Search failed.");
                return;
            }

            render(data.results || []);
        });
    }

    field.oninput = () => {
        if (timer)
            window.clearTimeout(timer);

        timer = window.setTimeout(run, DEBOUNCE_MS);
    };

    return card;
}
