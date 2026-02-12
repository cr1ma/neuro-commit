<h1 align="center">NeuroCommit</h1>
<p align="center">
  <a href="https://www.npmjs.com/package/neuro-commit"><img src="https://img.shields.io/npm/v/neuro-commit.svg?colorB=97CA00&label=version"></a>
  <a href="https://www.npmjs.com/package/neuro-commit"><img src="https://img.shields.io/npm/dm/neuro-commit.svg?colorB=97CA00&label=downloads"></a>
  <a href="https://github.com/cr1ma/neuro-commit/blob/main/LICENSE"><img src="https://img.shields.io/github/license/cr1ma/neuro-commit"></a>
  <a href="https://github.com/cr1ma/neuro-commit/actions/workflows/publish.yml"><img src="https://github.com/cr1ma/neuro-commit/actions/workflows/publish.yml/badge.svg"></a>
</p>

<p align="center">
  A tool for generating high-quality commit messages based on <code>git diff</code>, designed for further use with neural networks.
</p>

---

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
4. The tool collects your staged diff, file list and stats
5. A `neuro-commit.md` file is generated in the current directory with:
   - Combined file list with statuses (`M`, `A`, `D`, etc.) and per-file stats
   - Lock file updates mentioned without noisy diffs
   - Summary of total insertions / deletions
   - Full diff output in a fenced `diff` code block

> **Note:** Lock files (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `uv.lock`, `Cargo.lock`, etc.) are listed as updated but their diffs are omitted to keep the output clean.

## 🔧 Development

```bash
# Lint
npm run lint

# Lint & auto-fix
npm run lint:fix
```

## 📝 License

[Apache License 2.0](LICENSE)

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/cr1ma/neuro-commit/issues).

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=cr1ma/neuro-commit&type=date&legend=top-left)](https://www.star-history.com/#cr1ma/neuro-commit&type=date&legend=top-left)
