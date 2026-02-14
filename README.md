<h1 align="center">NeuroCommit</h1>
<p align="center">
  <strong>AI-ready commit message generator powered by <code>git diff</code></strong>
</p>
<p align="center">
  <a href="https://www.npmjs.com/package/neuro-commit"><img src="https://img.shields.io/npm/v/neuro-commit.svg?colorB=97CA00&label=version" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/neuro-commit"><img src="https://img.shields.io/npm/dm/neuro-commit.svg?colorB=97CA00&label=downloads" alt="npm downloads"></a>
  <a href="https://github.com/cr1ma/neuro-commit/blob/main/LICENSE"><img src="https://img.shields.io/github/license/cr1ma/neuro-commit" alt="license"></a>
  <a href="https://github.com/cr1ma/neuro-commit/actions/workflows/publish.yml"><img src="https://github.com/cr1ma/neuro-commit/actions/workflows/publish.yml/badge.svg" alt="publish status"></a>
  <a href="https://github.com/cr1ma/neuro-commit/issues"><img src="https://img.shields.io/github/issues/cr1ma/neuro-commit" alt="open issues"></a>
  <a href="https://github.com/cr1ma/neuro-commit"><img src="https://img.shields.io/github/stars/cr1ma/neuro-commit" alt="stars"></a>
</p>

---

**NeuroCommit** is a zero-config CLI tool that analyzes your staged Git changes and generates a clean, structured Markdown summary — ready to be fed into any AI/LLM for high-quality commit message generation.

<p align="center">
  <img src="docs/assets/neuro-commit-screenshot.png" alt="NeuroCommit CLI screenshot" width="700">
</p>

## Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
- [How It Works](#-how-it-works)
- [Development](#-development)
- [Contributing](#-contributing)
- [Security](#-security)
- [License](#-license)
- [Star History](#-star-history)

## ✨ Features

- **Zero configuration** — works out of the box with any Git repository
- **Interactive UI** — beautiful terminal menu with keyboard navigation
- **Smart lock file handling** — detects lock files (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `Cargo.lock`, etc.) and omits their noisy diffs
- **Token estimation** — reports estimated token count (using `o200k_base` tokenizer) so you know the prompt size before pasting into an LLM
- **Structured Markdown output** — generates a `neuro-commit.md` with file list, per-file stats, and full diff
- **Update notifications** — automatically notifies you when a new version is available

## 🚀 Quick Start

### Using npx (No Installation Required)

```bash
npx neuro-commit
```

### Global Installation

```bash
npm install -g neuro-commit
```

Then run:

```bash
neuro-commit
```

## 📖 How It Works

1. Stage your changes with `git add`
2. Run `neuro-commit`
3. Select **Commit** mode from the interactive menu
4. The tool collects your staged diff, file list, and per-file stats
5. A `neuro-commit.md` file is generated in the current directory containing:
   - File list with statuses (`Added`, `Modified`, `Deleted`, etc.) and per-file insertions/deletions
   - Lock file entries listed without their diffs
   - Summary line with total files changed, insertions, and deletions
   - Full diff output in a fenced `diff` code block
6. Copy the contents of `neuro-commit.md` into your preferred AI assistant and ask it to write a commit message

> **Tip:** Lock files (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `uv.lock`, `Cargo.lock`, and others) are listed as changed but their diffs are omitted to keep the output clean and token-efficient.

## 🔧 Development

```bash
# Clone the repository
git clone https://github.com/cr1ma/neuro-commit.git
cd neuro-commit

# Install dependencies
npm install

# Run locally
npm start

# Lint
npm run lint

# Lint & auto-fix
npm run lint:fix
```

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Please read the [Contributing Guide](CONTRIBUTING.md) before submitting a pull request.

Feel free to check the [open issues](https://github.com/cr1ma/neuro-commit/issues).

## 🔒 Security

To report a vulnerability, please see our [Security Policy](SECURITY.md).

## 📝 License

This project is licensed under the [Apache License 2.0](LICENSE).

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=cr1ma/neuro-commit&type=date&legend=top-left)](https://www.star-history.com/#cr1ma/neuro-commit&type=date&legend=top-left)
