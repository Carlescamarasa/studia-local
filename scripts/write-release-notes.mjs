import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

/**
 * UTILS
 */
function sh(cmd) {
    try {
        return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"], encoding: "utf-8" }).trim();
    } catch (e) {
        return "";
    }
}

const deployDir = path.resolve("deploy");
if (!fs.existsSync(deployDir)) {
    fs.mkdirSync(deployDir, { recursive: true });
}

const outDir = path.resolve("dist");
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

const LAST_COMMIT_FILE = path.join(deployDir, "LAST_DEPLOYED_COMMIT");

/**
 * CONFIG
 */
const versionName = process.env.VERSION_NAME || "dev";
const currentCommit = sh("git rev-parse --short HEAD") || "unknown";

// Calculate range
let fromCommit = "";
if (fs.existsSync(LAST_COMMIT_FILE)) {
    fromCommit = fs.readFileSync(LAST_COMMIT_FILE, "utf-8").trim();
}

if (!fromCommit) {
    // If no previous commit, find the very first commit
    fromCommit = sh("git rev-list --max-parents=0 HEAD");
}

// Format Release ID (matches release.sh logic approximately)
const now = new Date();
const dateStr = now.toISOString().split('T')[0];
const timeStr = now.getHours().toString().padStart(2, '0') + now.getMinutes().toString().padStart(2, '0');
const releaseId = `${dateStr}_${timeStr}_${versionName}`;

/**
 * LOG EXTRACTION
 */
console.log(`[changelog] Calculating changes from ${fromCommit} to ${currentCommit}...`);

// Get log items
// Format: hash|date|author|subject
const logCmd = `git log ${fromCommit}..${currentCommit} --pretty=format:"%h|%as|%an|%s"`;
const logOutput = sh(logCmd);

const items = logOutput ? logOutput.split("\n").map(line => {
    const [hash, date, author, subject] = line.split("|");
    return { hash, date, author, subject };
}) : [];

/**
 * OUTPUT
 */
const payload = {
    versionName,
    releaseId,
    commitRange: {
        from: fromCommit.substring(0, 7),
        to: currentCommit
    },
    generatedAt: now.toISOString(),
    items
};

fs.writeFileSync(path.join(outDir, "release-notes.json"), JSON.stringify(payload, null, 2));
console.log(`[changelog] Wrote dist/release-notes.json with ${items.length} items.`);

// Update LAST_DEPLOYED_COMMIT for next time
fs.writeFileSync(LAST_COMMIT_FILE, currentCommit);
console.log(`[changelog] Updated deploy/LAST_DEPLOYED_COMMIT to ${currentCommit}`);
