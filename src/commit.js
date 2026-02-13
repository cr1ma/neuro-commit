const fs = require("fs");
const path = require("path");
const { get_encoding } = require("tiktoken");
const {
  getStagedFiles,
  getStagedDiff,
  getStagedNumstat,
  isGitRepo,
  isLockFile,
  statusLabel,
} = require("./git");

// --- ANSI helpers ---
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";

const OUTPUT_FILE = "neuro-commit.md";
const encoder = get_encoding("o200k_base");

/**
 * Build the markdown content for neuro-commit.md
 */
function buildMarkdown(stagedFiles, diff, numstat) {
  const lines = [];

  const lockFiles = stagedFiles.filter((f) => isLockFile(f.file));
  const regularFiles = stagedFiles.filter((f) => !isLockFile(f.file));

  // Build a lookup: filename -> { added, deleted }
  const statMap = new Map();
  for (const entry of numstat) {
    statMap.set(entry.file, entry);
  }

  // --- Header ---
  lines.push("# Staged Changes Summary");
  lines.push("");

  // --- Combined file list with stats ---
  lines.push("## Changed Files");
  lines.push("");
  lines.push("```");

  // Compute column widths for alignment
  const allFiles = [...regularFiles, ...lockFiles];
  const maxLen = Math.max(...allFiles.map((f) => f.file.length), 0);

  for (const { status, file } of regularFiles) {
    const s = statMap.get(file);
    const stat = s ? ` | +${s.added} -${s.deleted}` : "";
    const pad = " ".repeat(Math.max(0, maxLen - file.length));
    lines.push(`${status}  ${file}${pad}${stat}`);
  }

  for (const { status, file } of lockFiles) {
    const pad = " ".repeat(Math.max(0, maxLen - file.length));
    lines.push(`${status}  ${file}${pad} | lock file (diff omitted)`);
  }

  lines.push("```");

  // Summary line
  const totalAdded = numstat.reduce((sum, e) => sum + e.added, 0);
  const totalDeleted = numstat.reduce((sum, e) => sum + e.deleted, 0);
  lines.push("");
  lines.push(
    `> **${allFiles.length}** files changed, **${totalAdded}** insertions(+), **${totalDeleted}** deletions(-)`,
  );
  lines.push("");

  // --- Diff ---
  if (diff) {
    lines.push("## Diff");
    lines.push("");
    lines.push("```diff");
    lines.push(diff);
    lines.push("```");
    lines.push("");
  }

  return lines.join("\n");
}

function estimateTokens(text) {
  return encoder.encode(text).length;
}

function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function printSummary(files, content, outputFile) {
  const totalFiles = files.length;
  const totalChars = content.length;
  const totalTokens = estimateTokens(content);

  console.log("");
  console.log(
    `${CYAN}✓${RESET} Generated ${BOLD}${outputFile}${RESET} ${DIM}(${formatNumber(totalFiles)} files, ${formatNumber(totalTokens)} tokens, ${formatNumber(totalChars)} chars)${RESET}`,
  );
  console.log("");
}

/**
 * Run the commit mode — gather staged info and write neuro-commit.md
 */
function runCommitMode() {
  // Pre-flight checks
  if (!isGitRepo()) {
    console.log(
      `\n${RED}✖ Error:${RESET} not a git repository. Run this inside a git project.\n`,
    );
    process.exit(1);
  }

  const stagedFiles = getStagedFiles();

  if (stagedFiles.length === 0) {
    console.log(
      `\n${YELLOW}⚠ No staged changes found.${RESET} Stage files with ${CYAN}git add${RESET} first.\n`,
    );
    process.exit(0);
  }

  console.log(`\n${BOLD}Commit Mode${RESET}`);
  console.log(`${DIM}Analyzing staged changes...${RESET}\n`);

  const diff = getStagedDiff();
  const numstat = getStagedNumstat();

  const lockFiles = stagedFiles.filter((f) => isLockFile(f.file));
  const regularFiles = stagedFiles.filter((f) => !isLockFile(f.file));

  // Print file list
  for (const { status, file } of regularFiles) {
    const color = status === "A" ? GREEN : status === "D" ? RED : YELLOW;
    console.log(`  ${color}${statusLabel(status)}${RESET}  ${file}`);
  }

  if (lockFiles.length > 0) {
    for (const { file } of lockFiles) {
      console.log(`  ${DIM}${statusLabel("M")}  ${file} (lock file)${RESET}`);
    }
  }

  // Generate markdown
  const md = buildMarkdown(stagedFiles, diff, numstat);
  const outPath = path.resolve(process.cwd(), OUTPUT_FILE);
  fs.writeFileSync(outPath, md, "utf-8");

  printSummary(stagedFiles, md, OUTPUT_FILE);
}

module.exports = { runCommitMode };
