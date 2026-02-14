const readline = require("readline");

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const HIDE_CURSOR = "\x1b[?25l";
const SHOW_CURSOR = "\x1b[?25h";

/**
 * Interactive select menu. Returns selected index, or -1 on Escape.
 */
function showSelectMenu(prompt, items) {
  return new Promise((resolve) => {
    let selected = 0;

    if (!process.stdin.isTTY) {
      console.error("Error: interactive mode requires a TTY terminal.");
      process.exit(1);
    }

    process.stdout.write(HIDE_CURSOR);
    process.stdout.write("\n".repeat(items.length + 2));
    render();

    readline.emitKeypressEvents(process.stdin);
    if (!process.stdin.isRaw) process.stdin.setRawMode(true);
    process.stdin.resume();

    function render() {
      process.stdout.write(`\x1b[${items.length + 2}A`);
      process.stdout.write(`${BOLD}${prompt}${RESET}\x1b[K\n\x1b[K\n`);

      for (let i = 0; i < items.length; i++) {
        const { label, description } = items[i];
        const desc = description ? ` ${DIM}— ${description}${RESET}` : "";
        if (i === selected) {
          process.stdout.write(
            `  ${GREEN}❯${RESET} ${BOLD}${label}${RESET}${desc}\x1b[K\n`,
          );
        } else {
          process.stdout.write(`    ${label}${desc}\x1b[K\n`);
        }
      }
      process.stdout.write("\x1b[J");
    }

    function onKeyPress(_str, key) {
      if (!key) return;

      if ((key.ctrl && key.name === "c") || key.name === "q") {
        cleanup();
        process.exit(0);
      }

      if (key.name === "escape") {
        cleanup();
        resolve(-1);
        return;
      }

      if (key.name === "up") {
        selected = (selected - 1 + items.length) % items.length;
        render();
        return;
      }

      if (key.name === "down") {
        selected = (selected + 1) % items.length;
        render();
        return;
      }

      if (key.name === "return") {
        cleanup();
        resolve(selected);
      }
    }

    function cleanup() {
      process.stdin.removeListener("keypress", onKeyPress);
      if (process.stdin.isRaw) process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write(SHOW_CURSOR);
    }

    process.stdin.on("keypress", onKeyPress);
  });
}

/**
 * Yes/no confirmation prompt.
 */
function confirm(prompt, defaultYes = true) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const hint = defaultYes ? "Y/n" : "y/N";
    rl.question(`${prompt} ${DIM}(${hint})${RESET} `, (answer) => {
      rl.close();
      const t = answer.trim().toLowerCase();
      resolve(t === "" ? defaultYes : t === "y" || t === "yes");
    });
  });
}

/**
 * Free-form text input.
 */
/**
 * Format number with space separators.
 */
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/**
 * Simple spinner for async operations.
 */
function createSpinner(text) {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let i = 0;
  let interval = null;

  return {
    start() {
      process.stdout.write(HIDE_CURSOR);
      interval = setInterval(() => {
        process.stdout.write(`\r${CYAN}${frames[i]}${RESET} ${text}\x1b[K`);
        i = (i + 1) % frames.length;
      }, 80);
    },
    stop(finalText) {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
      process.stdout.write("\r\x1b[K");
      if (finalText) process.stdout.write(`${finalText}\n`);
      process.stdout.write(SHOW_CURSOR);
    },
  };
}

module.exports = {
  RESET,
  BOLD,
  DIM,
  GREEN,
  YELLOW,
  RED,
  CYAN,
  HIDE_CURSOR,
  SHOW_CURSOR,
  showSelectMenu,
  confirm,
  formatNumber,
  createSpinner,
};
