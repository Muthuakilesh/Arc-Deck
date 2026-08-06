// The frontend ships straight to the browser with no bundler or transpiler, so a
// syntax error takes the whole app down and a too-new API silently breaks the
// oldest phone we support (iPhone 5s / Safari 12). Both are checked here.
//
//     node tools/check-frontend.mjs

import { spawn } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FRONTEND = join(ROOT, "frontend");

// Everything here needs a Safari newer than 12.
const BANNED_JS = [
    [/\?\./, "optional chaining (?.) — needs Safari 13.1"],
    [/\?\?/, "nullish coalescing (??) — needs Safari 13.1"],
    [/\.replaceChildren\(/, "replaceChildren() — needs Safari 14; use mount() from js/dom.js"],
    [/Object\.fromEntries/, "Object.fromEntries — needs Safari 12.1"],
    [/Promise\.allSettled/, "Promise.allSettled — needs Safari 13"],
    [/\.replaceAll\(/, "String.replaceAll — needs Safari 13.1"],
    [/\bglobalThis\b/, "globalThis — needs Safari 12.1"],
    [/\.flatMap\(/, "Array.flatMap — needs Safari 12"],
    [/structuredClone\(/, "structuredClone — needs Safari 15.4"],
    [/\.at\(/, "Array.at — needs Safari 15.4"],
    [/Object\.hasOwn/, "Object.hasOwn — needs Safari 15.4"]
];

const failures = [];


async function walk(dir) {
    const found = [];

    for (const entry of await readdir(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);

        // Third-party bundles are shipped as published; they are not ours to lint.
        if (entry.name === "vendor")
            continue;

        if (entry.isDirectory())
            found.push(...await walk(path));
        else
            found.push(path);
    }

    return found;
}


function checkSyntax(path, source) {
    return new Promise(resolve => {
        // Parsed as a module from stdin: --check never runs the code, so no DOM
        // is needed, and stdin avoids node treating a bare .js file as CommonJS.
        const node = spawn(process.execPath, ["--input-type=module", "--check"]);
        let stderr = "";

        node.stderr.on("data", chunk => { stderr += chunk; });

        node.on("close", code => {
            if (code !== 0) {
                const reason = stderr.split("\n").find(line => line.includes("Error")) || "syntax error";
                failures.push(`${relative(ROOT, path)}: ${reason.trim()}`);
            }

            resolve();
        });

        node.stdin.end(source);
    });
}


function stripComments(source) {
    return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}


function checkBannedApis(path, source) {
    const lines = stripComments(source).split("\n");

    lines.forEach((line, index) => {
        for (const [pattern, message] of BANNED_JS) {
            if (pattern.test(line))
                failures.push(`${relative(ROOT, path)}:${index + 1}: ${message}`);
        }
    });
}


// Declarations Safari 12 drops entirely, so they need a preceding fallback.
function checkCss(path, source) {
    const rules = source.matchAll(/([^{}]*)\{([^{}]*)\}/g);

    for (const rule of rules) {
        const body = rule[2];
        const line = source.slice(0, rule.index).split("\n").length;
        const where = `${relative(ROOT, path)}:${line}`;

        if (/(^|[\s;])inset\s*:/.test(body))
            failures.push(`${where}: 'inset' shorthand — needs Safari 14.1; write top/right/bottom/left`);

        for (const declaration of body.split(";")) {
            const match = declaration.match(/([\w-]+)\s*:\s*[^:]*clamp\(/);

            if (!match)
                continue;

            const property = match[1];
            const fallbacks = body.split(";").filter(other =>
                new RegExp(`(^|[\\s])${property}\\s*:`).test(other) && !other.includes("clamp("));

            if (fallbacks.length === 0)
                failures.push(`${where}: '${property}: clamp(...)' — needs Safari 13.1; repeat the property with a plain value first`);
        }

        if (/(^|[\s;])appearance\s*:/.test(body) && !body.includes("-webkit-appearance"))
            failures.push(`${where}: 'appearance' without '-webkit-appearance' — iOS keeps the native control`);

        // Safari 12 honours gap in grid but silently ignores it in flex, and it
        // can't be feature-queried apart, so flex rows have to space with margins.
        if (/display\s*:\s*(inline-)?flex/.test(body) && /(^|[\s;])(row-|column-)?gap\s*:/.test(body))
            failures.push(`${where}: 'gap' in a flex container — Safari 12 ignores it; space children with margins`);
    }
}


const files = await walk(FRONTEND);

for (const path of files.filter(name => name.endsWith(".js"))) {
    const source = await readFile(path, "utf8");

    await checkSyntax(path, source);
    checkBannedApis(path, source);
}

for (const path of files.filter(name => name.endsWith(".css")))
    checkCss(path, await readFile(path, "utf8"));

if (failures.length) {
    console.error(`frontend check failed (${failures.length}):`);
    failures.forEach(failure => console.error(`  ${failure}`));
    process.exit(1);
}

console.log(`frontend check passed (${files.length} files)`);
