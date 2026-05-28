# @skyastrall/mentions

Fast, headless **@mentions**, **#hashtags**, **/slash commands**, and any custom trigger — for **React**, **Vue 3**, and **Svelte 5**. One ~9KB framework-agnostic core. Zero runtime dependencies.

[![npm core](https://img.shields.io/npm/v/@skyastrall/mentions-core?label=core)](https://www.npmjs.com/package/@skyastrall/mentions-core)
[![npm react](https://img.shields.io/npm/v/@skyastrall/mentions-react?label=react)](https://www.npmjs.com/package/@skyastrall/mentions-react)
[![npm vue](https://img.shields.io/npm/v/@skyastrall/mentions-vue?label=vue)](https://www.npmjs.com/package/@skyastrall/mentions-vue)
[![npm svelte](https://img.shields.io/npm/v/@skyastrall/mentions-svelte?label=svelte)](https://www.npmjs.com/package/@skyastrall/mentions-svelte)
[![bundle size](https://img.shields.io/bundlejs/size/@skyastrall/mentions-core?label=core%20gzip)](https://bundlejs.com/?q=%40skyastrall%2Fmentions-core)
[![CI](https://github.com/SkyAstrall/mentions/actions/workflows/ci.yml/badge.svg)](https://github.com/SkyAstrall/mentions/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/@skyastrall/mentions-core)](./LICENSE)

**[Documentation](https://mentions.skyastrall.com/docs)** · **[Playground](https://mentions.skyastrall.com/playground)** · **[Migration Guides](https://mentions.skyastrall.com/docs/migration/v0-3-1-to-v0-3-2)**

---

## Install

```bash
# React
npm install @skyastrall/mentions-react

# Vue 3
npm install @skyastrall/mentions-vue

# Svelte 5
npm install @skyastrall/mentions-svelte
```

## Quick Start — React

```tsx
import { Mentions } from "@skyastrall/mentions-react";

const users = [
  { id: "1", label: "Alice Johnson" },
  { id: "2", label: "Bob Smith" },
];

<Mentions
  triggers={[{ char: "@", data: users, color: "rgba(99,102,241,0.25)" }]}
  onChange={(markup, plainText) => console.log(markup)}
/>;
```

## Quick Start — Vue 3

```vue
<script setup>
import { ref } from "vue";
import { Mentions } from "@skyastrall/mentions-vue";

const markup = ref("");
</script>

<template>
  <Mentions
    :triggers="[{ char: '@', data: users, color: 'rgba(99,102,241,0.25)' }]"
    v-model="markup"
  />
</template>
```

## Quick Start — Svelte 5

```svelte
<script>
  import { Mentions } from "@skyastrall/mentions-svelte";
  let markup = $state("");
</script>

<Mentions
  triggers={[{ char: "@", data: users, color: "rgba(99,102,241,0.25)" }]}
  onChange={(m) => (markup = m)}
/>
```

## Three API Layers

Every adapter ships the same three layers:

**1. Drop-in component** — works out of the box:

```tsx
<Mentions triggers={triggers} onChange={handleChange} />
```

**2. Compound components** — control the layout:

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

**3. Headless hook / composable / runes** — full control:

```tsx
// React
const { editorRef, inputProps, isOpen, items, getItemProps } =
  useMentions({ triggers });

// Vue
const { editorRef, inputProps, isOpen, items, getItemProps } =
  useMentions({ triggers });

// Svelte 5
const m = useMentions({ triggers });
// m.isOpen, m.items, etc. — reactive runes
```

## Features

- **Multi-trigger** with per-trigger colors and independent data sources
- **Contenteditable** with DOM-first architecture — no virtual DOM diffing
- **Ghost text** for AI inline completions (Tab to accept)
- **Async data** with debounce, abort, and loading states
- **Single-line mode** with 5-layer newline prevention
- **WAI-ARIA combobox** with full keyboard navigation
- **Grammarly/extension defense** so your editor doesn't get hijacked
- **Controlled and uncontrolled** modes
- **~9KB core + ~5KB adapter** gzipped, zero runtime dependencies in core
- **TypeScript-first** — full generics flow through every API
- **React 18 & 19, Vue 3.4+, Svelte 5+**

## Packages

| Package | Description | Size (gzip) |
|---------|-------------|-------------|
| [`@skyastrall/mentions-core`](https://www.npmjs.com/package/@skyastrall/mentions-core) | Framework-agnostic engine — state machine, parser, trigger detection | ~9 KB |
| [`@skyastrall/mentions-react`](https://www.npmjs.com/package/@skyastrall/mentions-react) | React 18/19 adapter — component, compound components, `useMentions` hook | ~5 KB |
| [`@skyastrall/mentions-vue`](https://www.npmjs.com/package/@skyastrall/mentions-vue) | Vue 3.4+ adapter — component, compound components, `useMentions` composable | ~5 KB |
| [`@skyastrall/mentions-svelte`](https://www.npmjs.com/package/@skyastrall/mentions-svelte) | Svelte 5 adapter — runes-powered components and composable | ~5 KB |

## Why @skyastrall/mentions?

- **Truly headless.** No CSS opinions, no portal magic. You bring the UI.
- **Multi-framework.** Same primitives across React, Vue, and Svelte — pick one or use all three.
- **Not a full editor.** If you need a full WYSIWYG, use [Tiptap](https://tiptap.dev) or [Lexical](https://lexical.dev). If you need mentions/triggers in a textarea-like input, this is what you want.
- **No runtime deps in the core.** The engine runs in Node — testable without jsdom for pure logic.
- **WAI-ARIA combobox** out of the box — tested for screen reader compliance.

## Links

- [Documentation](https://mentions.skyastrall.com/docs)
- [Interactive Playground](https://mentions.skyastrall.com/playground) (React / Vue / Svelte)
- [API Reference](https://mentions.skyastrall.com/docs/api/mentions)
- [Migration Guides](https://mentions.skyastrall.com/docs/migration/v0-3-1-to-v0-3-2)
- [Contributing](./CONTRIBUTING.md)
- [Changelog](./CHANGELOG.md)

## License

[MIT](./LICENSE) — Built by [SkyAstrall](https://skyastrall.com)
