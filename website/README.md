# website — mentions.skyastrall.com

The public documentation, API reference, and interactive playground for [`@skyastrall/mentions`](../README.md).

Deployed at: **https://mentions.skyastrall.com**

---

## What this is

An [Astro](https://astro.build) static site that:

- Documents the public API of every adapter (`core`, `react`, `vue`, `svelte`, `angular`).
- Renders the same examples **side-by-side in React, Vue, Svelte, and Angular** so you can compare framework idioms at a glance.
- Hosts the live playground at `/playground` for hands-on experimentation.
- Builds to fully static HTML/CSS/JS — no server, no edge runtime, just files. Hostable on any static target.

The site links into the monorepo via `workspace:^` dependencies, so it always demos the local working copy of the packages during development.

---

## Stack

| Layer | Tool |
|---|---|
| Static site generator | Astro 6 |
| React island | `@astrojs/react` (React 19) |
| Vue island | `@astrojs/vue` (Vue 3.5) |
| Svelte island | `@astrojs/svelte` (Svelte 5) |
| Angular island | `@analogjs/astro-angular` (Angular 21) |
| Styling | Tailwind CSS 4 via `@tailwindcss/vite` |
| Bundler | Vite 7 (Astro-managed) |

Each interactive demo is an **island** — a small mounted component in the chosen framework. Astro ships zero JS for the static parts of the page; only the islands hydrate. The Angular playground is a standalone `<sa-mentions>` component rendered as a zoneless island via `@analogjs/astro-angular`.

---

## Source structure

```
website/
├── public/                      Static assets served as-is
│   ├── favicon.ico
│   ├── favicon.svg
│   └── og-image.png             Social-share preview
│
├── src/
│   ├── pages/                   File-based routes
│   │   ├── index.astro          Landing page
│   │   ├── docs/                /docs/* — all documentation pages
│   │   └── playground/          /playground — interactive sandbox
│   │
│   ├── layouts/
│   │   ├── BaseLayout.astro     Header, footer, theme, fonts
│   │   └── DocsLayout.astro     BaseLayout + sidebar + page nav
│   │
│   ├── components/              Shared + per-framework islands
│   │   ├── Nav.astro            Top navigation
│   │   ├── DocsSidebar.astro    Left-side docs nav
│   │   ├── ThemeToggle.astro    Light/dark switcher
│   │   ├── Code.astro           Inline code block (syntax highlighted)
│   │   ├── CodeSnippet.astro    Standalone code card
│   │   ├── CodeTabs.astro       Framework-switching code tabs (React/Vue/Svelte/Angular)
│   │   ├── PropsTable.astro     API reference table renderer
│   │   ├── FeatureCard.astro    Marketing card
│   │   ├── react/               React islands (interactive demos)
│   │   ├── vue/                 Vue islands
│   │   ├── svelte/              Svelte islands
│   │   └── angular/             Angular islands (@analogjs/astro-angular)
│   │
│   ├── data/
│   │   ├── code-examples.ts     Landing-page hero snippets + framework tab metadata
│   │   ├── docs-nav.ts          Sidebar structure
│   │   └── mock.ts              Sample mention data (users, tags, commands) used by demos
│   │
│   ├── scripts/
│   │   ├── copy.ts              "Copy code" button behavior
│   │   └── fw-sync.ts           Framework-tab selection persistence (localStorage)
│   │
│   └── styles/                  Tailwind layers + custom CSS
│
├── astro.config.mjs             Astro integrations + Vite config
├── package.json
├── tsconfig.json
└── CHANGELOG.md                 Per-release site changes
```

### Adding a new docs page

1. Create `src/pages/docs/<your-page>.astro`.
2. Use `DocsLayout` and frontmatter:
   ```astro
   ---
   import DocsLayout from "../../layouts/DocsLayout.astro";
   ---
   <DocsLayout title="Your page">
     <!-- content -->
   </DocsLayout>
   ```
3. Add it to `src/data/docs-nav.ts` so the sidebar picks it up.

### Adding a new code example to `CodeTabs`

`CodeTabs` shows the same example across framework tabs. It takes the source for each framework as a prop — `react` and `vue` are required, `svelte` and `angular` are optional (their tab only renders when provided):

```astro
---
import CodeTabs from "../../components/CodeTabs.astro";
---
<CodeTabs
  label="Async data"
  react={`const { items } = useMentions({ triggers });`}
  vue={`const { items } = useMentions({ triggers });`}
  svelte={`const m = useMentions({ triggers });`}
  angular={`<sa-mentions [triggers]="triggers()" />`}
/>
```

The tabbed selection is persisted across pages via `src/scripts/fw-sync.ts` — clicking "Svelte" once keeps the tab on Svelte everywhere.

### Adding an interactive demo island

For framework `X` in `{ react, vue, svelte }`:

1. Build the demo as a single component in `src/components/X/<DemoName>.<ext>`.
2. Import it in any `.astro` page and hydrate with the appropriate directive:
   ```astro
   ---
   import ReactDemo from "../components/react/MyDemo.tsx";
   import VueDemo from "../components/vue/MyDemo.vue";
   import SvelteDemo from "../components/svelte/MyDemo.svelte";
   ---
   <ReactDemo client:visible />
   <VueDemo client:visible />
   <SvelteDemo client:visible />
   ```
3. Use `client:visible` for below-the-fold demos to defer hydration until scroll, or `client:load` if it must work immediately.

Angular islands live in `src/components/angular/` as standalone `.ts` components (e.g. `AngularPlayground.ts`) rendered via `@analogjs/astro-angular` — see `astro.config.mjs` for the integration wiring.

---

## Commands

All commands run from `website/` (or from repo root with `pnpm --filter website <cmd>`):

| Command | Action |
|---|---|
| `pnpm dev` | Start the local dev server at `localhost:4321` with HMR for all islands |
| `pnpm build` | Build the production site to `./dist/` |
| `pnpm preview` | Serve the built `./dist/` locally for a final check before deploy |
| `pnpm astro check` | Type-check `.astro` files |

Local development links into the workspace packages — edit `packages/react/src/use-mentions.ts`, rebuild that package (`pnpm --filter @skyastrall/mentions-react build`), and the site picks up the change on next reload.

---

## Deployment

The `dist/` output is fully static. Any static host works:

- **Cloudflare Pages / Workers Static** — current production target.
- **Vercel / Netlify** — drop-in static deploys.
- **GitHub Pages** — set `site` in `astro.config.mjs` to the Pages URL.

There is no SSR, no edge function, no API route. If you need search, swap in [Pagefind](https://pagefind.app/) as a post-build step.

---

## Conventions

- **Tabs, 100-char line width** — matches the repo Biome config.
- **Tailwind utility classes only** — no scoped `<style>` blocks in pages or components, unless absolutely needed for an island.
- **The landing-page hero snippets and framework tab metadata live in `src/data/code-examples.ts`** (`heroExamples` keyed by framework name, plus the `frameworks` list). Docs-page `CodeTabs` snippets are passed inline as props, not sourced from here.
- **Islands import the published package name** (`@skyastrall/mentions-react`), not a relative path — the workspace resolution does the linking.

---

## Related

- [Root README](../README.md) — package overview
- [CONTRIBUTING.md](../CONTRIBUTING.md) — workflow + commit conventions
- [`playground/`](../playground/) — local Vite scratch app for React-only iteration
