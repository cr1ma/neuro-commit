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
  gitCommit,
  gitPush,
} = require("./git");
const {
  buildFilesInfo,
  generateCommitMessage,
  calculateCost,
  estimateCost,
  countTokens,
} = require("./ai");
const { loadConfig } = require("./config");
const {
  RESET,
  BOLD,
  DIM,
  GREEN,
  YELLOW,
  RED,
  CYAN,
  showSelectMenu,
  confirm,
  formatNumber,
  createSpinner,
} = require("./ui");

/**
 * Main AI Commit flow.
 */
async function runAiCommitMode() {
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

  // Show file summary
  const maxLen = Math.max(...stagedFiles.map((f) => f.file.length), 0);
  console.log(
    `\n${BOLD}${stagedFiles.length} files${RESET} staged on ${CYAN}${branch}${RESET}\n`,
  );

  for (const { status, file } of stagedFiles) {
    const pad = " ".repeat(Math.max(0, maxLen - file.length));
    if (isLockFile(file)) {
      console.log(
        `  ${DIM}${statusLabel(status).padEnd(10)} ${file}${pad} (lock)${RESET}`,
      );
    } else {
      const color = status === "A" ? GREEN : status === "D" ? RED : YELLOW;
      const s = numstat.find((n) => n.file === file);
      const stat = s ? ` ${DIM}+${s.added} -${s.deleted}${RESET}` : "";
      console.log(
        `  ${color}${statusLabel(status).padEnd(10)}${RESET} ${file}${pad}${stat}`,
      );
    }
  }

  const estimatedTokens = countTokens(diff);
  const cost = estimateCost(estimatedTokens, 150);
  console.log(
    `\n${DIM}~${formatNumber(estimatedTokens)} tokens | est. $${cost.toFixed(4)}${RESET}\n`,
  );

  const proceed = await confirm("Generate commit message?", true);
  if (!proceed) {
    console.log(`${DIM}Cancelled.${RESET}\n`);
    return;
  }

  // Build context
  const context = { branch };
  if (config.commitHistory > 0) {
    context.recentCommits = getRecentCommits(config.commitHistory);
  }

  const filesInfo = buildFilesInfo(stagedFiles, numstat);

  // Generate
  let message;
  try {
    const result = await generate(diff, filesInfo, context, config);
    message = result.message;
  } catch (err) {
    console.log(`\n${RED}✖${RESET} ${err.message}\n`);
    if (
      err.message.includes("API key") ||
      err.message.includes("OPENAI") ||
      err.message.includes("401")
    ) {
      console.log(
        `${DIM}Linux/macOS: ${CYAN}export OPENAI_API_KEY="sk-..."${RESET}`,
      );
      console.log(
        `${DIM}PowerShell:  ${CYAN}$env:OPENAI_API_KEY = "sk-..."${RESET}`,
      );
      console.log(
        `${DIM}CMD:         ${CYAN}set OPENAI_API_KEY=sk-...${RESET}\n`,
      );
    }
    return;
  }

  // Auto-commit if configured
  if (config.autoCommit) {
    const result = gitCommit(message);
    if (result.success) {
      console.log(
        `\n${GREEN}✓${RESET} ${result.hash} ${message.split("\n")[0]}`,
      );
      if (config.autoPush) {
        const pushResult = gitPush();
        if (pushResult.success) {
          console.log(`${GREEN}✓${RESET} Pushed`);
        } else {
          console.log(`${RED}✖${RESET} Push failed: ${pushResult.error}`);
        }
      }
      console.log("");
    } else {
      console.log(`\n${RED}✖${RESET} ${result.error}\n`);
    }
    return;
  }

  // Action loop
  while (true) {
    console.log(`\n${message}\n`);

    const action = await showSelectMenu("Action:", [
      { label: "Commit" },
      { label: "Edit" },
      { label: "Regenerate" },
      { label: "Cancel" },
    ]);

    switch (action) {
      case 0: {
        const result = gitCommit(message);
        if (result.success) {
          console.log(
            `\n${GREEN}✓${RESET} ${result.hash} ${message.split("\n")[0]}`,
          );
          if (config.autoPush) {
            const pushResult = gitPush();
            if (pushResult.success) {
              console.log(`${GREEN}✓${RESET} Pushed`);
            } else {
              console.log(`${RED}✖${RESET} Push failed: ${pushResult.error}`);
            }
          }
          console.log("");
        } else {
          console.log(`\n${RED}✖${RESET} ${result.error}\n`);
        }
        return;
      }

      case 1: {
        message = await editMessage(message);
        break;
      }

      case 2: {
        const style = await showSelectMenu("Style:", [
          { label: "Different approach" },
          { label: "More concise" },
          { label: "More detailed" },
        ]);

        let extra;
        if (style === 0) {
          extra =
            "\n\nGenerate a DIFFERENT style commit message. Try a different angle.";
        } else if (style === 1) {
          extra = "\n\nMake it MORE CONCISE. Fewer bullet points, shorter.";
        } else if (style === 2) {
          extra = "\n\nMake it MORE DETAILED. Include technical details.";
        } else {
          break;
        }

        try {
          const result = await generate(
            diff,
            filesInfo,
            context,
            config,
            extra,
          );
          message = result.message;
        } catch (err) {
          console.log(`\n${RED}✖${RESET} ${err.message}`);
        }
        break;
      }

      case 3:
      case -1:
        console.log(`${DIM}Cancelled.${RESET}\n`);
        return;
    }
  }
}

/**
 * Call API with spinner, return { message, usage }.
 */
async function generate(diff, filesInfo, context, config, extra = "") {
  const spinner = createSpinner("Generating...");
  spinner.start();
  const startTime = Date.now();

  let result;
  try {
    result = await generateCommitMessage(diff, filesInfo, context, extra);
  } catch (err) {
    spinner.stop(`${RED}✖${RESET} ${err.message}`);
    throw err;
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  let statsLine = `${GREEN}✓${RESET} ${elapsed}s`;

  if (result.usage) {
    const stats = calculateCost(result.usage);
    statsLine += ` ${DIM}| ${formatNumber(stats.inputTokens)}→${formatNumber(stats.outputTokens)} tokens | $${stats.cost.toFixed(6)}${RESET}`;
    if (config.devMode) {
      statsLine += ` ${DIM}[dev]${RESET}`;
    }
  }

  spinner.stop(statsLine);
  return result;
}

/**
 * Open message in editor (VS Code by default).
 */
async function editMessage(message) {
  const os = require("os");
  const tmpFile = path.join(os.tmpdir(), `neuro-commit-${Date.now()}.txt`);

  fs.writeFileSync(
    tmpFile,
    `${message}\n\n# Edit the commit message above.\n# Lines starting with '#' are ignored.\n`,
    "utf-8",
  );

  const editorCmd = process.env.VISUAL || process.env.EDITOR || "code --wait";
  const parts = editorCmd.split(/\s+/);
  const editorBin = parts[0];
  const editorArgs = [...parts.slice(1), tmpFile];

  try {
    const { execFileSync } = require("child_process");
    execFileSync(editorBin, editorArgs, { stdio: "inherit", shell: true });
  } catch {
    console.log(`${YELLOW}⚠${RESET} Editor failed. Message unchanged.`);
    try {
      fs.unlinkSync(tmpFile);
    } catch {
      // ignore
    }
    return message;
  }

  try {
    const edited = fs.readFileSync(tmpFile, "utf-8");
    const cleaned = edited
      .split("\n")
      .filter((l) => !l.startsWith("#"))
      .join("\n")
      .trim();

    fs.unlinkSync(tmpFile);

    if (cleaned) {
      console.log(`${GREEN}✓${RESET} Message updated`);
      return cleaned;
    }
    console.log(`${YELLOW}⚠${RESET} Empty message, keeping original.`);
    return message;
  } catch {
    return message;
  }
}

module.exports = { runAiCommitMode };
