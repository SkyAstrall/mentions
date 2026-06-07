# @skyastrall/mentions-core

Framework-agnostic engine for trigger detection, markup parsing, and mention state management. Zero dependencies. Runs in Node.js, browser, or any JS runtime.

[![npm version](https://img.shields.io/npm/v/@skyastrall/mentions-core)](https://www.npmjs.com/package/@skyastrall/mentions-core)
[![bundle size](https://img.shields.io/bundlejs/size/@skyastrall/mentions-core)](https://bundlejs.com/?q=%40skyastrall%2Fmentions-core)

**[Docs](https://mentions.skyastrall.com/docs)** · **[Playground](https://mentions.skyastrall.com/playground)** · **[GitHub](https://github.com/SkyAstrall/mentions)**

> Most users should install a framework adapter instead:
> [`@skyastrall/mentions-react`](https://www.npmjs.com/package/@skyastrall/mentions-react),
> [`@skyastrall/mentions-vue`](https://www.npmjs.com/package/@skyastrall/mentions-vue),
> [`@skyastrall/mentions-svelte`](https://www.npmjs.com/package/@skyastrall/mentions-svelte), or
> [`@skyastrall/mentions-angular`](https://www.npmjs.com/package/@skyastrall/mentions-angular).
> This package is for **building custom adapters**, **server-side usage** (parsing markup, extracting mentions), or any non-framework context.

## Install

```bash
npm install @skyastrall/mentions-core
```

## What's inside

- **`MentionController`** — `subscribe`/`getState` store (TanStack-style) that drives the mention lifecycle: debounce, abort, fetch staleness, and callbacks.
- **State machine** — pure reducer for the mention lifecycle (`idle → suggesting → navigating → loading`) with state-scoped transitions.
- **Markup parser** — `parseMarkup()`, `extractMentions()`, `markupToPlainText()`, `plainIndexToMarkupIndex()`, `applyChange()`.
- **Trigger detection** — `detectTrigger()`, backward scan, multi-character triggers sorted longest-first.
- **ARIA props** — `connect(state, id)` generates exact-shape `InputAriaProps` / `ListAriaProps` / `ItemAriaProps`. WAI-ARIA 1.2 combobox.
- **DOM utilities** (browser-only) — `buildMentionHTML()`, `performMentionInsertion()`, `getCaretRect()`, `getCursorOffset()`, `getMarkupFromDOM()`, `getPlainTextFromDOM()`, `restoreCursor()`, `insertTextAtCursor()`, `isExtensionNode()`.
- **Filter** — `filterItems()` (default case-insensitive prefix-then-includes). Replaceable via `filterFn`.
- **CSS variables** — `--mention-bg`, `--mention-color`, `--mention-radius` for theming `<mark data-mention>` nodes.
- **Optional effects stylesheet** — `import "@skyastrall/mentions-core/effects.css"` for prebuilt focus/animation classes (`mentions-gradient-border`, `mentions-shimmer`, `mentions-glow`, `mentions-animate`) and their `--mentions-*` variables.
- **~6 KB minified + gzipped, zero runtime dependencies.**

## Server-side usage

The parser and markup utilities run anywhere — Node, edge runtimes, Bun, Deno. No DOM, no framework.

```ts
import { extractMentions, markupToPlainText } from "@skyastrall/mentions-core";

const markup = "@[Alice](1) said #[urgent](t1)";
const triggers = [
  { char: "@", data: [] },
  { char: "#", data: [] },
];

const mentions = extractMentions(markup, triggers);
// → [{ id: "1", label: "Alice" }, { id: "t1", label: "urgent" }]

const plain = markupToPlainText(markup, triggers);
// → "@Alice said #urgent"
```

## Building a custom adapter

Every shipped adapter (`react`, `vue`, `svelte`, `angular`) follows the same recipe against this package:

1. `new MentionController({ triggers, initialMarkup, callbacks })`
2. Subscribe with your framework's reactivity primitive (`useSyncExternalStore`, `shallowRef`, `$state`, `signal`)
3. Render `connect(state, id)` to spread ARIA props onto the editor / listbox / options
4. Wire `input`, `keydown`, `compositionstart`, `compositionend`, `blur`, `paste`, `drop` to controller methods
5. Call `performMentionInsertion(...)` then `controller.handleInsertComplete(...)` on select
6. `controller.destroy()` on unmount

[`packages/react/src/use-mentions.ts`](https://github.com/SkyAstrall/mentions/blob/main/packages/react/src/use-mentions.ts) is the shortest reference. Vue, Svelte, and Angular follow the same shape.

## License

[MIT](https://github.com/SkyAstrall/mentions/blob/main/LICENSE) — Built by [SkyAstrall](https://skyastrall.com)
