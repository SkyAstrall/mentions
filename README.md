<div align="center">

# @skyastrall/mentions

**A tiny, headless, framework-agnostic engine for `@mentions`, `#hashtags`, `/slash commands`, and any custom trigger.**

One ~9 KB core. React, Vue 3, and Svelte 5 adapters. Zero runtime dependencies. WAI-ARIA combobox out of the box.

[![CI](https://github.com/SkyAstrall/mentions/actions/workflows/ci.yml/badge.svg)](https://github.com/SkyAstrall/mentions/actions/workflows/ci.yml)
[![bundle size](https://img.shields.io/bundlejs/size/@skyastrall/mentions-core?label=core%20gzip)](https://bundlejs.com/?q=%40skyastrall%2Fmentions-core)
[![license](https://img.shields.io/npm/l/@skyastrall/mentions-core)](./LICENSE)
[![release](https://img.shields.io/github/v/release/SkyAstrall/mentions)](https://github.com/SkyAstrall/mentions/releases)

[**Documentation**](https://mentions.skyastrall.com/docs) · [**Playground**](https://mentions.skyastrall.com/playground) · [**Releases**](https://github.com/SkyAstrall/mentions/releases) · [**Changelog**](./CHANGELOG.md)

</div>

---

## Pick your adapter

| Package | For | Install | Version |
|---|---|---|---|
| [`@skyastrall/mentions-react`](./packages/react) | **React 18 / 19** | `npm i @skyastrall/mentions-react` | [![v](https://img.shields.io/npm/v/@skyastrall/mentions-react?label=)](https://www.npmjs.com/package/@skyastrall/mentions-react) |
| [`@skyastrall/mentions-vue`](./packages/vue) | **Vue 3.4+** | `npm i @skyastrall/mentions-vue` | [![v](https://img.shields.io/npm/v/@skyastrall/mentions-vue?label=)](https://www.npmjs.com/package/@skyastrall/mentions-vue) |
| [`@skyastrall/mentions-svelte`](./packages/svelte) | **Svelte 5** | `npm i @skyastrall/mentions-svelte` | [![v](https://img.shields.io/npm/v/@skyastrall/mentions-svelte?label=)](https://www.npmjs.com/package/@skyastrall/mentions-svelte) |
| [`@skyastrall/mentions-core`](./packages/core) | **Any framework / vanilla JS** | `npm i @skyastrall/mentions-core` | [![v](https://img.shields.io/npm/v/@skyastrall/mentions-core?label=)](https://www.npmjs.com/package/@skyastrall/mentions-core) |

Every adapter is a thin (~5 KB) wrapper around the same `MentionController` from `core`. Pick one, or use them side-by-side in the same monorepo.

---

## Quick start

<details open>
<summary><strong>React</strong></summary>

```tsx
import { Mentions } from "@skyastrall/mentions-react";

const users = [{ id: "1", label: "Alice" }, { id: "2", label: "Bob" }];

<Mentions
  triggers={[{ char: "@", data: users, color: "rgba(99,102,241,0.25)" }]}
  onChange={(markup, plainText) => console.log(markup)}
/>;
```
</details>

<details>
<summary><strong>Vue 3</strong></summary>

```vue
<script setup>
import { ref } from "vue";
import { Mentions } from "@skyastrall/mentions-vue";

const users = [{ id: "1", label: "Alice" }, { id: "2", label: "Bob" }];
const markup = ref("");
</script>

<template>
  <Mentions
    :triggers="[{ char: '@', data: users, color: 'rgba(99,102,241,0.25)' }]"
    v-model="markup"
  />
</template>
```
</details>

<details>
<summary><strong>Svelte 5</strong></summary>

```svelte
<script>
  import { Mentions } from "@skyastrall/mentions-svelte";

  const users = [{ id: "1", label: "Alice" }, { id: "2", label: "Bob" }];
  let markup = $state("");
</script>

<Mentions
  triggers={[{ char: "@", data: users, color: "rgba(99,102,241,0.25)" }]}
  onChange={(m) => (markup = m)}
/>
```
</details>

> **More patterns** — multi-trigger, async data, compound components, ghost text, single-line mode, headless hook/composable/runes — live in the [docs](https://mentions.skyastrall.com/docs).

---

## Three API layers

Every adapter ships the same three layers, so you can match the API to how much control you need.

**1. Drop-in component** — works without any plumbing.

```tsx
<Mentions triggers={triggers} onChange={handleChange} />
```

**2. Compound components** — own the layout, keep the behavior.

```tsx
<Mentions triggers={triggers}>
  <Mentions.Editor placeholder="Type @..." />
  <Mentions.Portal>
    <Mentions.List>
      <Mentions.Item render={({ item }) => <UserCard user={item} />} />
    </Mentions.List>
  </Mentions.Portal>
</Mentions>
```

**3. Headless hook / composable / runes** — full control. Bring your own UI.

```ts
const { editorRef, inputProps, isOpen, items, getItemProps } =
  useMentions({ triggers });
```

The hook (`useMentions` in React/Vue, runes-powered in Svelte) is the same shape everywhere — same state, same handlers, same ARIA wiring. Adapters are intentionally thin.

---

## Features

- **Multi-trigger** — `@`, `#`, `/`, or any character. Per-trigger colors and independent data sources.
- **Contenteditable, DOM-first** — cursor handled by the browser. No virtual DOM diffing. No reconciliation tax.
- **Async data** — debounce, abort-on-stale, loading states, error surface via `onError`.
- **Ghost text** — AI inline completions. Tab to accept.
- **Single-line mode** — 5-layer newline prevention (beforeinput, keydown, paste, drop, sanitize).
- **WAI-ARIA combobox** — full keyboard navigation, screen-reader tested (VoiceOver + Chrome).
- **Grammarly / extension defense** — `data-gramm` attributes + node filtering so third-party extensions don't hijack the editor.
- **Controlled & uncontrolled** modes.
- **TypeScript-first** — generics flow from `TriggerConfig<TData>` all the way through `onSelect`.
- **Tiny**: ~9 KB core + ~5 KB adapter (gzipped). Zero runtime deps in core.

---

## Why @skyastrall/mentions?

**It's headless, not "headless-ish".** Zero CSS opinions. No portal magic. You bring the UI.

**It's not a full editor.** If you need WYSIWYG, formatting toolbars, tables, or images — use [Tiptap](https://tiptap.dev) or [Lexical](https://lexical.dev). If you need clean, fast `@mentions` / `#tags` / `/commands` in a textarea-like surface, this is the smallest correct answer.

**It's actually multi-framework.** One `MentionController` in `core`, three thin adapters that all behave identically. Not a React port grudgingly ported to Vue.

**No runtime deps in `core`.** The engine runs in Node — pure logic, no jsdom required. That keeps the install graph tiny and the unit tests honest.

---

## Repo layout

```
packages/
  core/          framework-agnostic engine — MentionController, state machine, parser
  react/         React 18/19 adapter
  vue/           Vue 3.4+ adapter
  svelte/        Svelte 5 adapter (runes)
website/         Astro docs + playground (mentions.skyastrall.com)
playground/      Vite dev sandbox
e2e/             Playwright end-to-end tests
```

## Local development

```bash
pnpm install
pnpm build           # build all packages
pnpm test -- --run   # unit tests (Vitest)
pnpm test:e2e        # Playwright
pnpm lint            # Biome
```

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the full workflow.

---

## Links

- **Docs** — https://mentions.skyastrall.com/docs
- **Playground** — https://mentions.skyastrall.com/playground (React, Vue, Svelte side-by-side)
- **API reference** — https://mentions.skyastrall.com/docs/api/mentions
- **Releases** — https://github.com/SkyAstrall/mentions/releases
- **Changelog** — [CHANGELOG.md](./CHANGELOG.md)
- **Security policy** — [SECURITY.md](./SECURITY.md)
- **Code of conduct** — [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)

## License

[MIT](./LICENSE) — built by [SkyAstrall](https://skyastrall.com).
