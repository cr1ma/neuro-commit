const { execSync, execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

/**
 * Lock file patterns — diffs for these are too large and noisy.
 * We only mention that they were updated, without showing the diff.
 */
const LOCK_FILE_PATTERNS = [
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "uv.lock",
  "Cargo.lock",
  "Gemfile.lock",
  "poetry.lock",
  "composer.lock",
  "Pipfile.lock",
  "bun.lockb",
  "flake.lock",
  "go.sum",
  "shrinkwrap.yaml",
];

function isLockFile(filePath) {
  const name = filePath.split("/").pop();
  return LOCK_FILE_PATTERNS.some(
    (pattern) => name === pattern || name.endsWith(".lock"),
  );
}

/**
 * Returns a list of staged files with their status.
 * Each entry: { status: string, file: string }
 */
function getStagedFiles() {
  try {
    const raw = execSync("git diff --staged --name-status", {
      encoding: "utf-8",
    }).trim();

    if (!raw) return [];

    return raw.split("\n").map((line) => {
      const [status, ...rest] = line.split("\t");
      return { status: status.trim(), file: rest.join("\t").trim() };
    });
  } catch {
    return [];
  }
}

/**
 * Returns the full diff for staged changes, excluding lock files.
 */
function getStagedDiff() {
  const files = getStagedFiles();
  const nonLockFiles = files
    .filter((f) => !isLockFile(f.file))
    .map((f) => f.file);

  if (nonLockFiles.length === 0) return "";

  try {
    return execFileSync("git", ["diff", "--staged", "--", ...nonLockFiles], {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
    }).trim();
  } catch {
    return "";
  }
}

/**
 * Check if we are inside a git repository.
 */
function isGitRepo() {
  try {
    execSync("git rev-parse --is-inside-work-tree", {
      encoding: "utf-8",
      stdio: "pipe",
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Maps single-letter git status to a human-readable label.
 */
function statusLabel(code) {
  const map = {
    A: "Added",
    M: "Modified",
    D: "Deleted",
    R: "Renamed",
    C: "Copied",
    T: "Type changed",
    U: "Unmerged",
  };
  return map[code] || code;
}

/**
 * Returns numstat for staged changes: { file, added, deleted }
 */
function getStagedNumstat() {
  try {
    const raw = execSync("git diff --staged --numstat", {
      encoding: "utf-8",
    }).trim();

    if (!raw) return [];

    return raw.split("\n").map((line) => {
      const [added, deleted, ...rest] = line.split("\t");
      return {
        file: rest.join("\t").trim(),
        added: added === "-" ? 0 : parseInt(added, 10),
        deleted: deleted === "-" ? 0 : parseInt(deleted, 10),
      };
    });
  } catch {
    return [];
  }
}

/**
 * Get the current branch name.
 */
function getCurrentBranch() {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", {
      encoding: "utf-8",
      stdio: "pipe",
    }).trim();
  } catch {
    return "unknown";
  }
}

/**
 * Get recent commit messages for context.
 * @param {number} count - Number of recent commits to retrieve.
 */
function getRecentCommits(count = 5) {
  try {
    const raw = execSync(
      `git log --oneline -${count} --no-merges --format="%s"`,
      {
        encoding: "utf-8",
        stdio: "pipe",
      },
    ).trim();

    if (!raw) return [];
    return raw.split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Execute a git commit with the given message.
 * @param {string} message - The commit message.
 * @returns {{ success: boolean, hash?: string, error?: string }}
 */
function gitCommit(message) {
  try {
    const tmpFile = path.join(
      os.tmpdir(),
      `neuro-commit-msg-${Date.now()}.txt`,
    );
    fs.writeFileSync(tmpFile, message, "utf-8");

    execSync(`git commit -F "${tmpFile}"`, {
      encoding: "utf-8",
      stdio: "pipe",
    });

    // Get the short hash of the new commit
    const hash = execSync("git rev-parse --short HEAD", {
      encoding: "utf-8",
      stdio: "pipe",
    }).trim();

    // Clean up temp file
    try {
      fs.unlinkSync(tmpFile);
    } catch {
      // ignore cleanup errors
    }

    return { success: true, hash };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Push the current branch to origin.
 * @returns {{ success: boolean, error?: string }}
 */
function gitPush() {
  try {
    execSync("git push", {
      encoding: "utf-8",
      stdio: "pipe",
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = {
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
};
