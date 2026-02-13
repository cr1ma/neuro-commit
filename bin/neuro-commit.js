#!/usr/bin/env node

const readline = require("readline");
const { runCommitMode } = require("../src/commit");
const pkg = require("../package.json");

// --- ANSI helpers ---
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const HIDE_CURSOR = "\x1b[?25l";
const SHOW_CURSOR = "\x1b[?25h";

const banner = `
███╗   ██╗███████╗██╗   ██╗██████╗  ██████╗        ██████╗ ██████╗ ███╗   ███╗███╗   ███╗██╗████████╗
████╗  ██║██╔════╝██║   ██║██╔══██╗██╔═══██╗      ██╔════╝██╔═══██╗████╗ ████║████╗ ████║██║╚══██╔══╝
██╔██╗ ██║█████╗  ██║   ██║██████╔╝██║   ██║█████╗██║     ██║   ██║██╔████╔██║██╔████╔██║██║   ██║   
██║╚██╗██║██╔══╝  ██║   ██║██╔══██╗██║   ██║╚════╝██║     ██║   ██║██║╚██╔╝██║██║╚██╔╝██║██║   ██║   
██║ ╚████║███████╗╚██████╔╝██║  ██║╚██████╔╝      ╚██████╗╚██████╔╝██║ ╚═╝ ██║██║ ╚═╝ ██║██║   ██║   
╚═╝  ╚═══╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝        ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝     ╚═╝╚═╝   ╚═╝                                                                                                      
`;

// --- CLI flags ---
const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
${BOLD}neuro-commit${RESET} v${pkg.version} — AI-powered commit message generator

${BOLD}USAGE${RESET}
  neuro-commit              Launch interactive mode
  neuro-commit [options]

${BOLD}OPTIONS${RESET}
  -h, --help                Show this help message
  -v, --version             Show installed version

${BOLD}WORKFLOW${RESET}
  1. Stage your changes      ${DIM}git add <files>${RESET}
  2. Run neuro-commit        ${DIM}neuro-commit${RESET}
  3. Copy generated file     ${DIM}neuro-commit.md${RESET}
  4. Paste into your LLM     ${DIM}(ChatGPT, Claude, etc.)${RESET}
  5. Get your commit message!

${BOLD}LINKS${RESET}
  Repository   ${CYAN}${pkg.homepage}${RESET}
  Issues       ${CYAN}${pkg.bugs.url}${RESET}
`);
  process.exit(0);
}

if (args.includes("--version") || args.includes("-v")) {
  console.log(`neuro-commit v${pkg.version}`);
  process.exit(0);
}

// --- Menu options ---
const menuItems = [
  { label: "Commit", icon: "📝", description: "Generate a commit message" },
];

// Ensure cursor is restored if the process exits unexpectedly
process.on("exit", () => {
  process.stdout.write(SHOW_CURSOR);
});

process.on("SIGINT", () => {
  process.exit(0);
});

function renderMenu(selectedIndex) {
  const lines = menuItems.length + 2;
  process.stdout.write(`\x1b[${lines}A`);

  process.stdout.write(
    `${CYAN}?${RESET} ${BOLD}Select mode:${RESET} ${DIM}(use arrow keys)${RESET}\n\n`,
  );

  for (let i = 0; i < menuItems.length; i++) {
    const { label, icon, description } = menuItems[i];
    if (i === selectedIndex) {
      process.stdout.write(
        `  ${GREEN}❯ ${icon}  ${BOLD}${label}${RESET}  ${DIM}— ${description}${RESET}\n`,
      );
    } else {
      process.stdout.write(
        `    ${icon}  ${label}  ${DIM}— ${description}${RESET}\n`,
      );
    }
  }
}

function showMenu() {
  return new Promise((resolve) => {
    let selected = 0;

    if (!process.stdin.isTTY) {
      console.error("Error: interactive mode requires a TTY terminal.");
      process.exit(1);
    }

    process.stdout.write(HIDE_CURSOR);

    process.stdout.write("\n".repeat(menuItems.length + 2));
    renderMenu(selected);

    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();

    function onKeyPress(str, key) {
      if (!key) return;

      if ((key.ctrl && key.name === "c") || key.name === "q") {
        cleanup();
        console.log("\n👋 Goodbye!");
        process.exit(0);
      }

      if (key.name === "up" || key.name === "k") {
        selected = (selected - 1 + menuItems.length) % menuItems.length;
        renderMenu(selected);
        return;
      }

      if (key.name === "down" || key.name === "j") {
        selected = (selected + 1) % menuItems.length;
        renderMenu(selected);
        return;
      }

      if (key.name === "return") {
        cleanup();
        resolve(selected);
        return;
      }
    }

    function cleanup() {
      process.stdin.removeListener("keypress", onKeyPress);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write(SHOW_CURSOR);
    }

    process.stdin.on("keypress", onKeyPress);
  });
}

// --- Entry point ---
async function main() {
  console.clear();
  console.log(banner);

  try {
    const { default: updateNotifier } = await import("update-notifier");

    const notifier = updateNotifier({
      pkg,
      updateCheckInterval: 0,
    });

    // Cache may be empty on first run — fetch directly as fallback
    let updateInfo = notifier.update;
    if (!updateInfo) {
      try {
        updateInfo = await notifier.fetchInfo();
        if (updateInfo.type === "latest") {
          updateInfo = null;
        }
      } catch {
        // Network error — skip silently
      }
    }

    if (updateInfo) {
      console.log(
        `  ${YELLOW}Update available!${RESET} ${DIM}${updateInfo.current}${RESET} → ${GREEN}${updateInfo.latest}${RESET}`,
      );
      console.log(
        `  Run ${CYAN}npm install -g neuro-commit${RESET} to update\n`,
      );
    }
  } catch {
    // Ignore update check errors
  }

  const choice = await showMenu();

  switch (choice) {
    case 0:
      runCommitMode();
      break;
  }
}

main();
