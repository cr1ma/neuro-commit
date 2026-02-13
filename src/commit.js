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

// AI Prompt that will be added at the beginning of the generated file
const AI_PROMPT = `You are an expert in writing commit messages for repositories. Your task is to write me a commit message based on my diff file, which I will provide to you.

### Rules for writing a commit message:

1. Write in English, strictly considering the context.
2. Return the answer using markdown formatting.
3. Use the imperative mood, as if you are giving a command to the system that corresponds to messages that create changes in the code.
4. The first line of the message (title) should be short, usually no longer than 50 characters. This makes it easier to quickly understand the changes. Do not end the title with a period.
5. Leave one empty line after the title before starting the body of the message. This separation helps Git tools to correctly display the message text.
6. Commits with messages like "Fix" or "Update" do not provide useful information. Always explain what exactly was fixed or updated.
7. **Use lowercase letters to describe change types. Use** semantic tags in message titles:
   - \`feat:\` — adding a new feature
   - \`fix:\` — bug fixes
   - \`docs:\` — changes in documentation
   - \`style:\` — changes that do not affect the code (e.g., formatting fixes)
   - \`refactor:\` — code change that doesn't add new functionality or fix bugs
   - \`test:\` — adding or changing tests

### Example of a correct commit message:

\`\`\`diff
refactor: update environment configuration and API connection

- Edited \`.env\` file to support different environments (production, development) and API connection modes (docker, local, remote).
- Updated \`config.py\` to load tokens and URLs depending on the environment and API mode.
- Removed logic for determining the operating system.
- Updated \`api_client.py\` to use BASE_API_URL instead of OS-specific URLs.
- Reduced the number of retries in \`_make_request\`.
\`\`\`

---

`;

/**
 * Build the markdown content for neuro-commit.md
 */
function buildMarkdown(stagedFiles, diff, numstat) {
  const lines = [];

  // Start with the AI prompt
  lines.push(AI_PROMPT);

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
  console.log(`${BOLD}Next steps:${RESET}`);
  console.log(`  1. Open ${CYAN}${outputFile}${RESET}`);
  console.log(
    `  2. Copy the ${BOLD}entire content${RESET} (AI prompt is already included!)`,
  );
  console.log(`  3. Paste into your LLM (ChatGPT, Claude, etc.)`);
  console.log(`  4. Get your perfect commit message! 🎉`);
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
