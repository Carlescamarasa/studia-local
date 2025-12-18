import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function sh(cmd) {
    try { return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); }
    catch { return ""; }
}

const versionName =
    process.env.VERSION_NAME ||
    sh("git describe --tags --always") ||
    "dev";

const commit = sh("git rev-parse --short HEAD") || "unknown";
const author = sh('git log -1 --pretty=format:"%an"') || "unknown";
const buildDate = new Date().toISOString();

const payload = { versionName, commit, author, buildDate };

const outDir = path.resolve("dist");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "version.json"), JSON.stringify(payload, null, 2));

console.log("[version] wrote dist/version.json", payload);
