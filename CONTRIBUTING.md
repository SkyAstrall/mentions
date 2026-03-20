# Contributing to @skyastrall/mentions

This document explains how to contribute. All participants are expected to follow our [Code of Conduct](./CODE_OF_CONDUCT.md).

## Ways to Contribute

- Report bugs or request features via [Issues](https://github.com/SkyAstrall/mentions/issues)
- Ask or answer questions in [Discussions](https://github.com/SkyAstrall/mentions/discussions)
- Submit pull requests for bug fixes or features
- Improve documentation

New to open source? Check out [How to Contribute to an Open Source Project on GitHub](https://egghead.io/courses/how-to-contribute-to-an-open-source-project-on-github).

## Reporting Bugs

Search [existing issues](https://github.com/SkyAstrall/mentions/issues) first. If your bug isn't reported, open a new issue using the bug report template. Include a minimal reproduction (StackBlitz or CodeSandbox link).

## Development Setup

Requires [Node.js](https://nodejs.org/) 18+ (see `.nvmrc`) and [pnpm](https://pnpm.io/).

1. Fork the repository and clone your fork:

```bash
git clone https://github.com/<your-username>/mentions.git
cd mentions
```

2. Add the upstream remote:

```bash
git remote add upstream https://github.com/SkyAstrall/mentions.git
```

3. Install dependencies, build, and test:

```bash
pnpm install
pnpm build
pnpm test
```

## Project Structure

```
packages/
  core/       Framework-agnostic engine: trigger detection, state machine, markup parsing
  react/      React bindings: useMentions hook, Mentions component, effects CSS
playground/   Development app for manual testing and demos
```

- `@skyastrall/mentions-core` has zero dependencies and no framework code.
- `@skyastrall/mentions-react` depends on `core` and exports the public React API.
- The `playground` imports `@skyastrall/mentions-react` via `workspace:*`.

## Making Changes

### Which package to edit

- **Trigger detection, markup parsing, state machine** -- `packages/core`
- **React hooks, components, ARIA, rendering** -- `packages/react`
- **Both** -- start with `core`, build it, then update `react`

### Build and test

```bash
pnpm build        # builds core then react
pnpm test         # runs vitest
pnpm lint         # runs biome
```

### Run the playground

```bash
pnpm --filter playground dev
```

After rebuilding the packages (`pnpm build`), the playground picks up the changes.

## Commit Conventions

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add maxSuggestions per trigger
fix: prevent dropdown from closing on composition events
docs: update API reference table
refactor: simplify trigger detection logic
test: add tests for markup parser edge cases
chore: update dev dependencies
```

Use a scope when it clarifies the change:

```
feat(core): add allowSpaceInQuery option
fix(react): fix overlay scroll sync on resize
```

## Pull Requests

1. Create a feature branch from `main`:

```bash
git checkout -b feat/my-feature
```

2. Keep commits focused. One logical change per commit.

3. Ensure CI passes:
   - `pnpm build` succeeds
   - `pnpm test` passes
   - `pnpm lint` reports no errors

4. Write a clear PR description with what changed and why.

5. Check "Allow edits from maintainers" on your PR.

6. If your change affects the public API, update `README.md`.

7. If your change adds a new feature, add a demo to the playground.

## Changesets

This project uses [changesets](https://github.com/changesets/changesets) for versioning and changelogs. If your PR changes the public API or fixes a bug, add a changeset:

```bash
pnpm changeset
```

Follow the prompts to select the affected packages and describe the change.

## Code Style

- [Biome](https://biomejs.dev/) handles formatting and linting. Run `pnpm lint:fix` to auto-format.
- TypeScript strict mode is enabled.
- No `any` types. Use `unknown` and narrow.
- Prefer named exports over default exports.
