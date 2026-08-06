// Feature flags for old phones, applied to <html> so CSS can react to them.
function supportsFlexGap() {
    const probe = document.createElement("div");

    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.style.display = "flex";
    probe.style.flexDirection = "column";
    probe.style.rowGap = "10px";

    probe.appendChild(document.createElement("div"));
    probe.appendChild(document.createElement("div"));

    document.body.appendChild(probe);

    // Both children are empty, so any height at all is the gap being honoured.
    const supported = probe.scrollHeight >= 10;

    document.body.removeChild(probe);

    return supported;
}


export default function applyCompatFlags() {
    if (!supportsFlexGap())
        document.documentElement.className += " no-flex-gap";
}
