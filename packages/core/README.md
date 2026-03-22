# @skyastrall/mentions-core

Framework-agnostic engine for trigger detection, markup parsing, and mention state management. Zero dependencies. Runs in Node.js, browser, or any JS runtime.

[![npm version](https://img.shields.io/npm/v/@skyastrall/mentions-core)](https://www.npmjs.com/package/@skyastrall/mentions-core)
[![bundle size](https://img.shields.io/bundlejs/size/@skyastrall/mentions-core)](https://bundlejs.com/?q=%40skyastrall%2Fmentions-core)

**[Docs](https://mentions.skyastrall.com/docs)** · **[Playground](https://mentions.skyastrall.com/playground)** · **[GitHub](https://github.com/SkyAstrall/mentions)**

> Most users should install a framework adapter instead:
> [`@skyastrall/mentions-react`](https://www.npmjs.com/package/@skyastrall/mentions-react) or
> [`@skyastrall/mentions-vue`](https://www.npmjs.com/package/@skyastrall/mentions-vue).
> This package is for building custom adapters or server-side usage.

## Install

```bash
npm install @skyastrall/mentions-core
```

## What's Inside

- **MentionController** — subscribe/getState pattern for framework-agnostic state management
- **State machine** — pure reducer for mention lifecycle (idle → suggesting → navigating → loading)
- **Markup parser** — `parseMarkup()`, `extractMentions()`, `markupToPlainText()`
- **Trigger detection** — O(n) backward scan, no regex backtracking
- **ARIA props** — `connect()` generates combobox/listbox attributes
- **DOM utilities** — `buildMentionHTML()`, `performMentionInsertion()`, `getCaretRect()`
- ~9KB gzipped, zero dependencies

## Server-Side Usage

```typescript
import { extractMentions, markupToPlainText } from "@skyastrall/mentions-core";

const markup = "@[Alice](1) said #[urgent](t1)";
const triggers = [{ char: "@", data: [] }, { char: "#", data: [] }];

const mentions = extractMentions(markup, triggers);
const plain = markupToPlainText(markup, triggers);
```

## License

[MIT](https://github.com/SkyAstrall/mentions/blob/main/LICENSE) — Built by [SkyAstrall](https://skyastrall.com)
