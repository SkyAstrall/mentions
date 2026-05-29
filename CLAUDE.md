# Project: @skyastrall/mentions

## Shell Environment

Node.js (via fnm) and system tools are available via the PATH configured in `.claude/settings.local.json`. No special prefix is needed — commands like `pnpm`, `node`, and `git` work directly.

## Package Manager

This project uses **pnpm** with workspaces. Key commands:

- `pnpm build` — build all packages
- `pnpm test -- --run` — run unit tests
- `pnpm test:e2e` — run Playwright E2E tests
- `pnpm lint` — run Biome linter
- `pnpm size` — run size-limit budget check

## Architecture

- `packages/core` — framework-agnostic engine (zero dependencies)
- `packages/react` — React 18/19 adapter
- `packages/vue` — Vue 3.4+ adapter
- `packages/svelte` — Svelte 5 adapter (runes)
- `packages/angular` — Angular 19+ adapter (in progress)
- `website/` — Astro documentation site
- `playground/` — Vite dev playground

## Code Standards

- Use Biome for formatting (tabs, 100 char line width)
- Zero runtime dependencies in core
- All adapters are thin wrappers around `MentionController` from core
