import { emit } from "./events.js";
import { recordActivity } from "./activity.js";


const KEY = "arcdeck.focusSession";


function read() {
    try {
        const value = JSON.parse(localStorage.getItem(KEY) || "null");
        return value && typeof value === "object" ? value : null;
    } catch (error) {
        return null;
    }
}


function write(session) {
    try {
        if (session)
            localStorage.setItem(KEY, JSON.stringify(session));
        else
            localStorage.removeItem(KEY);
    } catch (error) {
        // Focus still works for the mounted page when storage is unavailable.
    }
    emit("focus:update", session);
    return session;
}


export function remainingSeconds(session = read()) {
    if (!session)
        return 0;
    if (session.status === "paused")
        return Math.max(0, Number(session.remaining) || 0);
    if (session.status !== "active")
        return 0;
    return Math.max(0, Math.ceil((Number(session.endsAt) - Date.now()) / 1000));
}


export function getFocusSession() {
    const session = read();
    if (session && session.status === "active" && remainingSeconds(session) <= 0) {
        session.status = "completed";
        session.completedAt = Date.now();
        write(session);
        recordActivity("focus.completed", {
            subject: session.label,
            action: "complete",
            source: "clock",
            context: { duration_seconds: session.duration }
        });
    }
    return session;
}


export function startFocus(duration, label = "Focus", sceneId = "") {
    const seconds = Math.max(1, Math.round(Number(duration) || 0));
    const session = write({
        id: Date.now().toString(36),
        label: String(label || "Focus").slice(0, 60),
        sceneId: String(sceneId || ""),
        duration: seconds,
        startedAt: Date.now(),
        endsAt: Date.now() + seconds * 1000,
        status: "active"
    });
    recordActivity("focus.started", {
        subject: session.label,
        action: "start",
        source: "clock",
        context: { scene_id: session.sceneId, duration_seconds: seconds }
    });
    return session;
}


export function pauseFocus() {
    const session = getFocusSession();
    if (!session || session.status !== "active")
        return session;
    session.remaining = remainingSeconds(session);
    session.status = "paused";
    write(session);
    recordActivity("focus.paused", { subject: session.label, action: "pause", source: "clock" });
    return session;
}


export function resumeFocus() {
    const session = getFocusSession();
    if (!session || session.status !== "paused")
        return session;
    session.endsAt = Date.now() + Math.max(1, session.remaining) * 1000;
    session.status = "active";
    delete session.remaining;
    return write(session);
}


export function endFocus(reason = "ended") {
    const session = getFocusSession();
    if (!session)
        return null;
    session.status = reason;
    session.endedAt = Date.now();
    write(session);
    recordActivity("focus.ended", { subject: session.label, action: reason, source: "clock" });
    return session;
}


export function resetFocus() {
    return write(null);
}