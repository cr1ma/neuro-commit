#!/usr/bin/env node

const { runCommitMode } = require("../src/commit");
const { runAiCommitMode } = require("../src/aiCommit");
const { runSettingsMenu } = require("../src/settings");
const { isAiAvailable } = require("../src/config");
const {
  RESET,
  BOLD,
  DIM,
  RED,
  CYAN,
  SHOW_CURSOR,
  showSelectMenu,
} = require("../src/ui");
const pkg = require("../package.json");

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`\n${BOLD}neuro-commit${RESET} v${pkg.version}\n`);
  console.log(`Usage:  neuro-commit`);
  console.log(`Flags:  -h, --help  |  -v, --version\n`);
  process.exit(0);
}

if (args.includes("--version") || args.includes("-v")) {
  console.log(`v${pkg.version}`);
  process.exit(0);
}

process.on("exit", () => process.stdout.write(SHOW_CURSOR));
process.on("SIGINT", () => process.exit(0));

/**
 * Non-blocking version check — runs once, prints hint if outdated.
 */
async function checkForUpdate() {
  try {
    const { default: latestVersion } = await import("latest-version");
    const latest = await latestVersion(pkg.name);
    if (latest && latest !== pkg.version) {
      console.log(
        `${DIM}Update available: ${pkg.version} → ${CYAN}${latest}${RESET}${DIM}  (npm i -g ${pkg.name})${RESET}`,
      );
    }
  } catch {
    // silently ignore network errors
  }
}

async function main() {
  while (true) {
    console.clear();
    console.log(
      `\n${BOLD}neuro-commit${RESET} ${DIM}v${pkg.version}${RESET}\n`,
    );

    // fire-and-forget update check (only first iteration matters visually)
    checkForUpdate();

    const choice = await showSelectMenu("Mode:", [
      { label: "AI Commit", description: "generate & commit" },
      { label: "Manual Mode", description: "save prompt to .md" },
      { label: "Settings" },
    ]);

    switch (choice) {
      case 0: {
        if (!isAiAvailable()) {
          console.log(
            `\n${RED}✖${RESET} Set ${CYAN}OPENAI_API_KEY${RESET} env variable first.`,
          );
          console.log(
            `${DIM}PowerShell:  $env:OPENAI_API_KEY = "sk-..."${RESET}`,
          );
          console.log(
            `${DIM}Linux/macOS: export OPENAI_API_KEY="sk-..."${RESET}\n`,
          );
          await new Promise((r) => setTimeout(r, 2000));
          break;
        }
        console.clear();
        await runAiCommitMode();
        return;
      }
      case 1:
        console.clear();
        runCommitMode();
        return;
      case 2:
        await runSettingsMenu();
        break;
      default:
        return;
    }
  }
}

main();
