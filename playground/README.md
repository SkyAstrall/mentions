# playground — local Vite sandbox

A tiny Vite + React app for **hands-on testing** of the mention adapter while you're working on the library. Not deployed, not the public playground.

> **For the public, deployed playground** (React, Vue, Svelte side-by-side), see `website/src/pages/playground/` — it builds into [mentions.skyastrall.com/playground](https://mentions.skyastrall.com/playground).
> This `playground/` directory is the **dev-time scratch app**: faster than the Astro site, no framework switching, no docs chrome — just the React adapter rendered in a blank page so you can hammer on it.

---

## Why does this exist?

When you change something deep in `packages/core/` or `packages/react/`, you want the shortest possible feedback loop:

```
edit core/src/* → pnpm --filter @skyastrall/mentions-core build → playground HMR
```

The Astro site rebuilds slowly because of its multi-framework integrations. This playground hot-reloads in milliseconds.

It's intentionally **React-only**. For touching Vue / Svelte / Angular code paths locally, run the docs site (`pnpm --filter website dev`) or build a one-off Vite app in your own scratch directory — adding multi-framework support here would slow it down without adding value.

---

## Stack

- Vite 8 + `@vitejs/plugin-react`
- React 19
- TypeScript 5.9 (strict)
- Workspace-linked `@skyastrall/mentions-react` (and transitively `@skyastrall/mentions-core`)

No router, no state library, no test setup. One page, one component, hot reload.

---

## Commands

From the repo root:

```bash
pnpm --filter playground dev      # start dev server (typically localhost:5173)
pnpm --filter playground build    # type-check + production build → playground/dist/
pnpm --filter playground preview  # serve the built ./dist/ locally
```

Or from inside `playground/`:

```bash
pnpm dev
pnpm build
pnpm preview
```

---

## Workflow

1. Edit your library code in `packages/core/` or `packages/react/`.
2. Rebuild the affected package:
   ```bash
   pnpm --filter @skyastrall/mentions-core build
   # or
   pnpm --filter @skyastrall/mentions-react build
   ```
3. The dev server picks up the change on the next HMR cycle.

For tightest iteration, run a `tsdown --watch` against the package you're editing in one terminal and the playground in another — every source change rebuilds the package and refreshes the playground.

---

## What lives here

```
playground/
├── index.html
├── src/                Your scratchpad — modify freely while testing
├── public/             Static assets
├── vite.config.ts
├── tsconfig.json       Project references config
├── tsconfig.app.json   App TS config
├── tsconfig.node.json  Vite config TS
└── package.json
```

The `src/` contents are not the source of truth for any user-facing example. Treat them as throwaway test scaffolding — edit them to reproduce bugs, demo features, or just verify your change works in a real browser.

---

## Related

- [Root README](../README.md) — package overview
- [`website/`](../website/) — public docs site + framework-comparison playground
- [`e2e/`](../e2e/) — Playwright tests (where your scratch repro should eventually graduate to)
- [CONTRIBUTING.md](../CONTRIBUTING.md) — full development workflow
