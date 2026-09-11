// The frontend ships straight to the browser with no bundler or transpiler, so a
// syntax error takes the whole app down. Only modern phones (Chrome on Android)
// are targeted now, so no old-Safari API/CSS restrictions apply here anymore.
//
//     node tools/check-frontend.mjs

import { spawn } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FRONTEND = join(ROOT, "frontend");

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

const files = await walk(FRONTEND);
for (const path of files.filter(name => name.endsWith(".js"))) {
    const source = await readFile(path, "utf8");

    await checkSyntax(path, source);
}

if (failures.length) {
    console.error(`frontend check failed (${failures.length}):`);
    failures.forEach(failure => console.error(`  ${failure}`));
    process.exit(1);
}

console.log(`frontend check passed (${files.length} files)`);
