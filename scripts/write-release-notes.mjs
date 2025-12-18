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

/**
 * Parse conventional commit type from subject
 * Returns: feat, fix, refactor, chore, docs, or "other"
 */
function parseCommitType(subject) {
    if (!subject) return "other";
    const lower = subject.toLowerCase();

    // Check for conventional commit format: type(scope): message or type: message
    const conventionalMatch = lower.match(/^(feat|fix|refactor|chore|docs|style|test|perf|ci|build)(\(.+\))?:/);
    if (conventionalMatch) {
        return conventionalMatch[1];
    }

    // Fallback: check for keywords anywhere in the subject
    if (lower.includes("feat") || lower.includes("add") || lower.includes("new")) return "feat";
    if (lower.includes("fix") || lower.includes("bug") || lower.includes("error") || lower.includes("issue")) return "fix";
    if (lower.includes("refactor") || lower.includes("clean") || lower.includes("improve")) return "refactor";
    if (lower.includes("doc") || lower.includes("readme") || lower.includes("comment")) return "docs";

    return "chore";
}

/**
 * Generate human-readable summary from grouped commits
 */
function generateSummaryText(byType) {
    const parts = [];
    if (byType.feat.count > 0) parts.push(`${byType.feat.count} feature${byType.feat.count > 1 ? 's' : ''}`);
    if (byType.fix.count > 0) parts.push(`${byType.fix.count} fix${byType.fix.count > 1 ? 'es' : ''}`);
    if (byType.refactor.count > 0) parts.push(`${byType.refactor.count} refactor${byType.refactor.count > 1 ? 's' : ''}`);
    if (byType.docs.count > 0) parts.push(`${byType.docs.count} doc${byType.docs.count > 1 ? 's' : ''}`);
    if (byType.chore.count > 0) parts.push(`${byType.chore.count} chore${byType.chore.count > 1 ? 's' : ''}`);

    return parts.length > 0 ? parts.join(', ') : 'No commits';
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
    const type = parseCommitType(subject);
    return { hash, date, author, subject, type };
}) : [];

/**
 * GENERATE SUMMARY BY TYPE
 */
const byType = {
    feat: { count: 0, items: [] },
    fix: { count: 0, items: [] },
    refactor: { count: 0, items: [] },
    docs: { count: 0, items: [] },
    chore: { count: 0, items: [] },
};

items.forEach(item => {
    const typeGroup = byType[item.type] || byType.chore;
    typeGroup.count++;
    // Only store first 5 subjects per type for the summary
    if (typeGroup.items.length < 5) {
        typeGroup.items.push(item.subject);
    }
});

const summary = {
    total: items.length,
    byType,
    text: generateSummaryText(byType),
};

console.log(`[changelog] Summary: ${summary.text}`);

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
    summary,
    items
};

fs.writeFileSync(path.join(outDir, "release-notes.json"), JSON.stringify(payload, null, 2));
console.log(`[changelog] Wrote dist/release-notes.json with ${items.length} items.`);

// Update LAST_DEPLOYED_COMMIT for next time
fs.writeFileSync(LAST_COMMIT_FILE, currentCommit);
console.log(`[changelog] Updated deploy/LAST_DEPLOYED_COMMIT to ${currentCommit}`);

