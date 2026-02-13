#!/usr/bin/env node

const readline = require("readline");
const { version } = require("../package.json");
const { runCommitMode } = require("../src/commit");

const banner = `
███╗   ██╗███████╗██╗   ██╗██████╗  ██████╗        ██████╗ ██████╗ ███╗   ███╗███╗   ███╗██╗████████╗
████╗  ██║██╔════╝██║   ██║██╔══██╗██╔═══██╗      ██╔════╝██╔═══██╗████╗ ████║████╗ ████║██║╚══██╔══╝
██╔██╗ ██║█████╗  ██║   ██║██████╔╝██║   ██║█████╗██║     ██║   ██║██╔████╔██║██╔████╔██║██║   ██║   
██║╚██╗██║██╔══╝  ██║   ██║██╔══██╗██║   ██║╚════╝██║     ██║   ██║██║╚██╔╝██║██║╚██╔╝██║██║   ██║   
██║ ╚████║███████╗╚██████╔╝██║  ██║╚██████╔╝      ╚██████╗╚██████╔╝██║ ╚═╝ ██║██║ ╚═╝ ██║██║   ██║   
╚═╝  ╚═══╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝        ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝     ╚═╝╚═╝   ╚═╝                                                                                                      
`;

// --- Menu options ---
const menuItems = [
  { label: "Commit", icon: "📝", description: "Generate a commit message" },
];

// --- ANSI helpers ---
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";
const HIDE_CURSOR = "\x1b[?25l";
const SHOW_CURSOR = "\x1b[?25h";

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
  console.log(`🧠 ${BOLD}neuro-commit${RESET} v${version}\n`);

  const choice = await showMenu();

  switch (choice) {
    case 0:
      runCommitMode();
      break;
  }
}

main();
