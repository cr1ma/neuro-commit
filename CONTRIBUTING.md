# Contributing to NeuroCommit

First off, thank you for considering contributing to **NeuroCommit**! Every contribution helps make this tool better for everyone.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Style Guide](#style-guide)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment. Be kind, constructive, and professional in all interactions.

## How Can I Contribute?

- **Report bugs** — Found something broken? [Open a bug report](https://github.com/cr1ma/neuro-commit/issues/new?template=bug_report.md)
- **Suggest features** — Have an idea? [Submit a feature request](https://github.com/cr1ma/neuro-commit/issues/new?template=feature_request.md)
- **Fix bugs** — Browse [open issues](https://github.com/cr1ma/neuro-commit/issues) and submit a PR
- **Improve documentation** — Typos, clarity, examples — all welcome
- **Write tests** — Help improve code coverage

## Getting Started

### Setup

1. **Fork** the repository on GitHub

2. **Clone** your fork locally:

   ```bash
   git clone https://github.com/<your-username>/neuro-commit.git
   cd neuro-commit
   ```

3. **Install** dependencies:

   ```bash
   npm install
   ```

4. **Run** the tool locally:

   ```bash
   npm start
   ```

## Development Workflow

1. Create a new branch from `main`:

   ```bash
   git checkout -b feature/my-feature
   ```

2. Make your changes

3. Run the linter to ensure code quality:

   ```bash
   npm run lint
   ```

4. Fix any linting issues:

   ```bash
   npm run lint:fix
   ```

5. Test your changes by running the tool:

   ```bash
   npm start
   ```

6. Commit your changes

7. Push to your fork and open a pull request

## Style Guide

This project uses **ESLint** for code quality. The configuration is in `eslint.config.mjs`.

Key conventions:

- Use `const` and `let` — never `var`
- Use `require()` for imports (CommonJS)
- Use double quotes for strings
- Use semicolons
- Keep functions small and focused
- Add JSDoc comments for public functions
- Use descriptive variable names

## Reporting Bugs

Use the [Bug Report template](https://github.com/cr1ma/neuro-commit/issues/new?template=bug_report.md) and include:

- Steps to reproduce the issue
- Expected vs. actual behavior
- Your environment (OS, Node.js version, npm version)
- Any error output or screenshots

## Suggesting Features

Use the [Feature Request template](https://github.com/cr1ma/neuro-commit/issues/new?template=feature_request.md) and include:

- The problem you're trying to solve
- Your proposed solution
- Any alternatives you've considered

---

Thank you for helping make NeuroCommit better! 🎉
