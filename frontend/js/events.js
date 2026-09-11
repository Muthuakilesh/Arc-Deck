const listeners = {};


export function on(event, callback) {
    if (!listeners[event])
        listeners[event] = [];

    listeners[event].push(callback);
}


export function off(event, callback) {
    const list = listeners[event];

    if (!list)
        return;

    const index = list.indexOf(callback);

    if (index !== -1)
        list.splice(index, 1);
}


export function emit(event, data) {
    if (!listeners[event])
        return;

    // Handlers unsubscribe themselves once their view is gone, so iterate a copy.
    listeners[event].slice().forEach(callback => callback(data));
}
