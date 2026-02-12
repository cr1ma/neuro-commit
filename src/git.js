const { execSync } = require("child_process");

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
    return execSync(
      `git diff --staged -- ${nonLockFiles.map((f) => `"${f}"`).join(" ")}`,
      { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 },
    ).trim();
  } catch {
    return "";
  }
}

/**
 * Returns diffstat summary for staged changes.
 */
function getStagedStats() {
  try {
    return execSync("git diff --staged --stat", {
      encoding: "utf-8",
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

module.exports = {
  getStagedFiles,
  getStagedDiff,
  getStagedStats,
  getStagedNumstat,
  isGitRepo,
  isLockFile,
  statusLabel,
  LOCK_FILE_PATTERNS,
};
