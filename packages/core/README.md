# @skyastrall/mentions-core

Framework-agnostic engine for trigger detection, markup parsing, and mention state management. Zero dependencies. Runs in Node.js, browser, or any JS runtime.

[![npm version](https://img.shields.io/npm/v/@skyastrall/mentions-core)](https://www.npmjs.com/package/@skyastrall/mentions-core)

**[Docs](https://mentions.skyastrall.com/docs)** · **[GitHub](https://github.com/SkyAstrall/mentions)**

> Most users should install [`@skyastrall/mentions-react`](https://www.npmjs.com/package/@skyastrall/mentions-react) instead. This package is for building custom adapters or server-side usage.

## Install

```bash
npm install @skyastrall/mentions-core
```

## What's Inside

- **State machine** — pure reducer for mention lifecycle (idle → suggesting → navigating → loading)
- **Markup parser** — `parseMarkup()`, `extractMentions()`, `markupToPlainText()`
- **Trigger detection** — O(n) backward scan, no regex backtracking
- **ARIA props** — `connect()` generates combobox/listbox attributes
- **Markup builder** — `createMentionMarkup()`, `insertMention()`

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
