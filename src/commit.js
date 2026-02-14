const fs = require("fs");
const path = require("path");
const {
  getStagedFiles,
  getStagedDiff,
  getStagedNumstat,
  isGitRepo,
  isLockFile,
  statusLabel,
  getCurrentBranch,
  getRecentCommits,
} = require("./git");
const { buildFilesInfo, buildSystemPrompt, buildUserPrompt } = require("./ai");
const { loadConfig } = require("./config");
const {
  RESET,
  BOLD,
  DIM,
  GREEN,
  YELLOW,
  RED,
  CYAN,
  formatNumber,
} = require("./ui");

const OUTPUT_FILE = "neuro-commit.md";

/**
 * Manual mode — builds the same prompt as AI mode and saves to .md file.
 */
function runCommitMode() {
  if (!isGitRepo()) {
    console.log(`\n${RED}✖${RESET} Not a git repository.\n`);
    process.exit(1);
  }

  const stagedFiles = getStagedFiles();
  if (stagedFiles.length === 0) {
    console.log(
      `\n${YELLOW}⚠${RESET} No staged changes. Run ${CYAN}git add${RESET} first.\n`,
    );
    process.exit(0);
  }

  const config = loadConfig();
  const diff = getStagedDiff();
  const numstat = getStagedNumstat();
  const branch = getCurrentBranch();

  const context = { branch };
  if (config.commitHistory > 0) {
    context.recentCommits = getRecentCommits(config.commitHistory);
  }

  const filesInfo = buildFilesInfo(stagedFiles, numstat);
  const systemPrompt = buildSystemPrompt(config, context);
  const userPrompt = buildUserPrompt(filesInfo, diff);

  const md = `${systemPrompt}\n\n---\n\n${userPrompt}`;
  const outPath = path.resolve(process.cwd(), OUTPUT_FILE);
  fs.writeFileSync(outPath, md, "utf-8");

  // Print file list
  console.log("");
  for (const { status, file } of stagedFiles) {
    if (isLockFile(file)) {
      console.log(
        `  ${DIM}${statusLabel(status).padEnd(10)} ${file} (lock)${RESET}`,
      );
    } else {
      const color = status === "A" ? GREEN : status === "D" ? RED : YELLOW;
      console.log(
        `  ${color}${statusLabel(status).padEnd(10)}${RESET} ${file}`,
      );
    }
  }

  const tokens = Math.ceil(md.length / 4);
  console.log(
    `\n${GREEN}✓${RESET} Saved to ${BOLD}${OUTPUT_FILE}${RESET} (~${formatNumber(tokens)} tokens)`,
  );
  console.log(`${DIM}Paste into ChatGPT, Claude, etc.${RESET}\n`);
}

module.exports = { runCommitMode };
