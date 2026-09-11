import mountChrome from "../js/chrome.js";
import { iconMarkup } from "../components/icon.js";

const CHECKLIST_KEY = "arcdeck.utilChecklist";
const NOTES_KEY = "arcdeck.utilNotes";

function loadJson(key, fallback) {
    try {
        const raw = localStorage.getItem(key);

        if (!raw)
            return fallback;

        const parsed = JSON.parse(raw);

        return parsed == null ? fallback : parsed;
    } catch (error) {
        return fallback;
    }
}

function saveJson(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        // Preference persistence is optional.
    }
}

export default function NotesPage() {
    const page = document.createElement("div");
    page.className = "notes-page page ios-modular-page";
    mountChrome();

    const checklist = loadJson(CHECKLIST_KEY, []);
    let checklistFilter = "open";
    let notes = String(loadJson(NOTES_KEY, "") || "");

    page.innerHTML = `
        <div class="page-intro">
            <p class="eyebrow">PERSONAL SPACE</p>
            <h1>Notes & checklist</h1>
        </div>
        <div class="notes-page-grid">
            <section class="utility-card card glass module notes-section notes-checklist">
                <div class="notes-section-heading"><div><p class="eyebrow">PERSONAL SPACE / CHECKLIST</p><h2>Tasks</h2><p class="notes-section-description">Track small tasks and things to remember.</p></div><span class="section-index">01</span></div>
                <div class="notes-section-toolbar"><div class="notes-filters" data-checklist-filters></div><span class="notes-progress" data-checklist-progress></span></div>
                <div class="utility-checklist-list" data-checklist-list></div>
                <div class="utility-checklist-add"><input type="text" maxlength="60" placeholder="Add a task"><button type="button" class="control-button icon-only-button" title="Add task" aria-label="Add task">+</button></div>
            </section>
            <section class="utility-card card glass module notes-section notes-writing">
                <div class="notes-section-heading"><div><p class="eyebrow">PERSONAL SPACE / NOTES</p><h2>Desk notes</h2><p class="notes-section-description">Keep a quick thought, detail, or reminder close.</p></div><span class="section-index">02</span></div>
                <textarea class="utility-notes" maxlength="400" placeholder="Write a note for later..."></textarea>
            </section>
        </div>`;

    const checklistList = page.querySelector("[data-checklist-list]");
    const checklistFilters = page.querySelector("[data-checklist-filters]");
    const checklistProgress = page.querySelector("[data-checklist-progress]");
    const checklistInput = page.querySelector(".utility-checklist-add input");
    const checklistAdd = page.querySelector(".utility-checklist-add button");
    const notesArea = page.querySelector(".utility-notes");

    const saveChecklist = () => {
        saveJson(CHECKLIST_KEY, checklist);
    };

    const renderChecklist = () => {
        checklistList.innerHTML = "";
        const completed = checklist.filter(item => item.done).length;
        const visible = checklist.filter(item => checklistFilter === "all" || (checklistFilter === "done" ? item.done : !item.done));
        checklistProgress.textContent = `${completed}/${checklist.length} done`;

        if (!visible.length) {
            const empty = document.createElement("p");
            empty.className = "utility-empty";
            empty.textContent = checklist.length ? "Nothing in this view." : "No tasks yet.";
            checklistList.appendChild(empty);
            return;
        }

        visible.forEach(item => {
            const row = document.createElement("div");
            const done = document.createElement("button");
            const text = document.createElement("span");
            const remove = document.createElement("button");

            row.className = "utility-checklist-row";

            done.type = "button";
            done.className = "utility-small-button" + (item.done ? " is-done" : "");
            done.innerHTML = item.done ? iconMarkup("check", { size: 14 }) : "";
            done.title = item.done ? "Mark task open" : "Mark task done";
            done.setAttribute("aria-label", item.done ? "Mark task open" : "Mark task done");
            done.onclick = () => {
                item.done = !item.done;
                saveChecklist();
                renderChecklist();
            };

            text.className = "utility-checklist-text" + (item.done ? " is-done" : "");
            text.textContent = item.text;

            remove.type = "button";
            remove.className = "utility-small-button";
            remove.innerHTML = iconMarkup("close", { size: 13 });
            remove.title = "Remove task";
            remove.setAttribute("aria-label", "Remove task");
            remove.onclick = () => {
                const next = checklist.filter(entry => entry.id !== item.id);
                checklist.splice(0, checklist.length, ...next);
                saveChecklist();
                renderChecklist();
            };

            row.append(done, text, remove);
            checklistList.appendChild(row);
        });
    };

    [
        { id: "open", label: "Open" },
        { id: "all", label: "All" },
        { id: "done", label: "Done" }
    ].forEach(filter => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "notes-filter";
        button.textContent = filter.label;
        button.onclick = () => {
            checklistFilter = filter.id;
            checklistFilters.querySelectorAll("button").forEach(item => item.classList.toggle("active", item === button));
            renderChecklist();
        };
        button.classList.toggle("active", filter.id === checklistFilter);
        checklistFilters.appendChild(button);
    });

    const addChecklistItem = () => {
        const text = String(checklistInput.value || "").trim();

        if (!text)
            return;

        checklist.push({ id: Date.now() + Math.random(), text: text, done: false });
        checklistInput.value = "";
        saveChecklist();
        renderChecklist();
    };

    checklistAdd.onclick = addChecklistItem;
    checklistInput.onkeydown = event => {
        if (event.key === "Enter")
            addChecklistItem();
    };

    notesArea.value = notes;
    notesArea.oninput = () => {
        notes = notesArea.value;
        saveJson(NOTES_KEY, notes);
    };

    renderChecklist();
    return page;
}
