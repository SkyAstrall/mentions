<div align="center">

# @skyastrall/mentions

**A tiny, headless engine for `@mentions`, `#hashtags`, `/slash commands`, and any custom trigger. One core, four shipped adapters — designed so a fifth is straightforward to add.**

~6 KB core. Zero runtime dependencies. WAI-ARIA 1.2 combobox out of the box. React 18+, Vue 3.4+, Svelte 5, Angular 21+.

[![CI](https://github.com/SkyAstrall/mentions/actions/workflows/ci.yml/badge.svg)](https://github.com/SkyAstrall/mentions/actions/workflows/ci.yml)
[![bundle size](https://img.shields.io/bundlejs/size/@skyastrall/mentions-core?label=core%20gzip)](https://bundlejs.com/?q=%40skyastrall%2Fmentions-core)
[![license](https://img.shields.io/npm/l/@skyastrall/mentions-core)](./LICENSE)
[![release](https://img.shields.io/github/v/release/SkyAstrall/mentions)](https://github.com/SkyAstrall/mentions/releases)

[**Documentation**](https://mentions.skyastrall.com/docs) · [**Playground**](https://mentions.skyastrall.com/playground) · [**Changelog**](./CHANGELOG.md) · [**Releases**](https://github.com/SkyAstrall/mentions/releases)

</div>

---

## Pick your adapter

| Package | For | Install | Version |
|---|---|---|---|
| [`@skyastrall/mentions-react`](./packages/react) | **React 18+** | `npm i @skyastrall/mentions-react` | [![v](https://img.shields.io/npm/v/@skyastrall/mentions-react?label=)](https://www.npmjs.com/package/@skyastrall/mentions-react) |
| [`@skyastrall/mentions-vue`](./packages/vue) | **Vue 3.4+** | `npm i @skyastrall/mentions-vue` | [![v](https://img.shields.io/npm/v/@skyastrall/mentions-vue?label=)](https://www.npmjs.com/package/@skyastrall/mentions-vue) |
| [`@skyastrall/mentions-svelte`](./packages/svelte) | **Svelte 5** | `npm i @skyastrall/mentions-svelte` | [![v](https://img.shields.io/npm/v/@skyastrall/mentions-svelte?label=)](https://www.npmjs.com/package/@skyastrall/mentions-svelte) |
| [`@skyastrall/mentions-angular`](./packages/angular) | **Angular 21+** | `npm i @skyastrall/mentions-angular` | [![v](https://img.shields.io/npm/v/@skyastrall/mentions-angular?label=)](https://www.npmjs.com/package/@skyastrall/mentions-angular) |
| [`@skyastrall/mentions-core`](./packages/core) | **Any framework / vanilla JS** | `npm i @skyastrall/mentions-core` | [![v](https://img.shields.io/npm/v/@skyastrall/mentions-core?label=)](https://www.npmjs.com/package/@skyastrall/mentions-core) |

Every adapter is a thin wrapper around the same [`MentionController`](./packages/core/src/controller.ts) in core. Pick one, mix several in a monorepo, or [request a new framework adapter](#want-an-adapter-for-a-different-framework) — the engine is designed for it.

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

<details>
<summary><strong>Angular</strong></summary>

```ts
import { Component, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { SaMentions, type TriggerConfig } from "@skyastrall/mentions-angular";

@Component({
  selector: "app-comment",
  standalone: true,
  imports: [SaMentions, FormsModule],
  template: `<sa-mentions [triggers]="triggers()" [(ngModel)]="markup" />`,
})
export class CommentComponent {
  triggers = signal<TriggerConfig[]>([
    { char: "@", data: [{ id: "1", label: "Alice" }, { id: "2", label: "Bob" }], color: "rgba(99,102,241,0.25)" },
  ]);
  markup = "";
}
```
</details>

> **More patterns** — multi-trigger, async data, compound components, ghost text, single-line mode, headless hook/composable/runes/signals — live in the [docs](https://mentions.skyastrall.com/docs).

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
      <Mentions.Empty>No results</Mentions.Empty>
      <Mentions.Loading>Searching…</Mentions.Loading>
    </Mentions.List>
  </Mentions.Portal>
</Mentions>
```

**3. Headless primitive** — full control, bring your own UI.

```ts
const { editorRef, inputProps, listProps, getItemProps, isOpen, items, mentions } =
  useMentions({ triggers });
```

| Framework | Headless primitive |
|---|---|
| React | `useMentions()` hook (backed by `useSyncExternalStore`) |
| Vue | `useMentions()` composable (backed by `shallowRef` + `watch`) |
| Svelte | `useMentions()` runes composable (`$state` + `$effect`) |
| Angular | `MentionsControllerBridge` (Angular `signal()` over the controller) |

The shape of the return is identical across frameworks — same state, same handlers, same ARIA wiring, same imperatives (`clear`, `focus`, `insertTrigger`).

---

## Features

- **Multi-trigger** — `@`, `#`, `/`, `::`, or any character. Per-trigger colors, data sources, and markup templates.
- **Contenteditable, DOM-first** — cursor handled by the browser. No virtual-DOM diffing for the editor surface. No reconciliation tax.
- **Async data with race safety** — debounce + AbortController + staleness check, owned by core. Late results from previous queries are silently dropped.
- **Ghost text** — AI inline completions. Tab to accept (when no suggestion is highlighted).
- **Single-line mode** — 5-layer newline prevention (`beforeinput`, `keydown`, `paste`, `drop`, sanitize).
- **WAI-ARIA 1.2 combobox** — full keyboard navigation, `aria-activedescendant` (focus never leaves the editor), spot-checked with VoiceOver on macOS.
- **Grammarly / LanguageTool defense** — `data-gramm` attributes + extension-node filtering so writing assistants don't hijack the editor.
- **Controlled & uncontrolled** modes — React `value`, Vue `v-model`, Svelte `value`, Angular `[(ngModel)]` and reactive forms via `ControlValueAccessor`.
- **TypeScript-first** — `MentionItem<TData>` generics flow through `triggers`, `onSelect`, and `mentions` so custom fields (avatars, emails, badges) keep their types end-to-end.
- **Tiny** — ~6 KB core + ~4 KB adapter (minified + gzipped). Zero runtime deps in core; each adapter has exactly one peer (the framework itself).

---

## Why @skyastrall/mentions?

**Built for parity, not as a port.** All adapters share one `MentionController` in core. They are not a React library shimmed into Vue with a `defineComponent` wrapper — every adapter reads the same state, dispatches the same actions, and produces the same ARIA contract. The framework-specific code is reactivity glue only.

**Designed for extensibility.** Adding a new framework adapter is a deterministic recipe: instantiate `MentionController`, subscribe with the framework's reactivity primitive (`useSyncExternalStore` / `shallowRef` / `$state` / `signal`), wire seven DOM event handlers, and render the props returned by `connect(state, id)`. The controller is `subscribe`/`getState`-shaped on purpose — every modern framework primitive consumes it the same way.

**It's headless, not "headless-ish."** Zero CSS opinions. No portal magic. You bring the UI. A small default stylesheet is shipped separately for consumers who want a sensible starting point.

**It's not a full editor.** If you need WYSIWYG, formatting toolbars, tables, or images — use [Tiptap](https://tiptap.dev) or [Lexical](https://lexical.dev). If you need fast, correct `@mentions` / `#tags` / `/commands` in a textarea-like surface, this is the smallest correct answer.

**No runtime deps in core.** The engine runs in Node — pure logic, no `jsdom` required. That keeps the install graph tiny and the unit tests honest.

---

## Want an adapter for a different framework?

Solid, Qwik, Preact, Lit, Mitosis, or something else? The engine is designed for it.

1. **[Open a feature request](https://github.com/SkyAstrall/mentions/issues/new?template=feature_request.yml)** with the "New framework adapter" type. We'll discuss ecosystem fit, version range, and co-maintenance before any code lands.
2. **Read the shipped adapters first** — [`packages/react/src/use-mentions.ts`](./packages/react/src/use-mentions.ts) is the shortest reference. Vue, Svelte, and Angular follow the same shape with their reactivity flavor.
3. **The contract** — every adapter does the same seven things: instantiate `MentionController`, subscribe with the framework's reactivity primitive, wire `input`/`keydown`/`compositionstart`/`compositionend`/`blur`/`paste`/`drop` to controller methods, render `connect(state, id)` for ARIA, call `performMentionInsertion(...)` on select, manage lifecycle (`controller.destroy()` on unmount), and expose three API layers (drop-in component, compound, headless primitive).

Most adapters land around 500–1,000 lines. The work is not "port the React code" — it's "implement those seven items against the core API."

---

## Repo layout

```
packages/
  core/          framework-agnostic engine — MentionController, state machine, parser, DOM helpers
  react/         React 18+ adapter
  vue/           Vue 3.4+ adapter
  svelte/        Svelte 5 adapter (runes)
  angular/       Angular 21+ adapter (signals + ControlValueAccessor)
website/         Astro docs + interactive playground (mentions.skyastrall.com)
playground/      Vite sandbox for manual hands-on testing of the React adapter
e2e/             Playwright cross-browser tests
```

## Local development

```bash
pnpm install
pnpm build           # build all packages, topological order
pnpm test -- --run   # unit tests (Vitest)
pnpm test:e2e        # Playwright (cross-framework)
pnpm lint            # Biome
pnpm size            # size-limit budget check
```

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the full workflow.

---

## Links

- **Docs** — https://mentions.skyastrall.com/docs
- **Playground** — https://mentions.skyastrall.com/playground (React, Vue, Svelte, Angular side-by-side)
- **API reference** — https://mentions.skyastrall.com/docs/api/mentions
- **Releases** — https://github.com/SkyAstrall/mentions/releases
- **Changelog** — [CHANGELOG.md](./CHANGELOG.md)
- **Security policy** — [SECURITY.md](./SECURITY.md)
- **Code of conduct** — [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)

## License

[MIT](./LICENSE) — built by [SkyAstrall](https://skyastrall.com).
