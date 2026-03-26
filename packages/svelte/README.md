# @skyastrall/mentions-svelte

Multi-trigger inline suggestions for Svelte 5. Drop-in component, compound components, or composable with runes.

[![npm version](https://img.shields.io/npm/v/@skyastrall/mentions-svelte)](https://www.npmjs.com/package/@skyastrall/mentions-svelte)
[![bundle size](https://img.shields.io/bundlejs/size/@skyastrall/mentions-svelte)](https://bundlejs.com/?q=%40skyastrall%2Fmentions-svelte)

**[Docs](https://mentions.skyastrall.com/docs)** · **[Playground](https://mentions.skyastrall.com/playground?fw=svelte)** · **[GitHub](https://github.com/SkyAstrall/mentions)**

## Install

```bash
npm install @skyastrall/mentions-svelte
```

Requires `svelte` >= 5.0.

## Quick Start

```svelte
<script>
import { Mentions } from "@skyastrall/mentions-svelte";

const users = [
  { id: "1", label: "Alice Johnson" },
  { id: "2", label: "Bob Smith" },
  { id: "3", label: "Charlie Brown" },
];

let markup = $state("");
</script>

<Mentions
  triggers={[
    { char: "@", data: users, color: "rgba(99,102,241,0.25)" },
    { char: "#", data: tags, color: "rgba(16,185,129,0.25)" },
    { char: "/", data: commands, color: "rgba(245,158,11,0.25)" },
  ]}
  onChange={(m, plainText) => { markup = m; }}
/>
```

## Features

- Multi-trigger (@mentions, #tags, /commands)
- Per-trigger highlight colors
- Ghost text / AI completions
- Async data with loading states
- Single-line mode
- Full ARIA keyboard navigation
- Svelte 5 runes ($state, $derived, $effect)
- Snippets for custom item rendering
- ~9KB gzipped (~9KB core)

## API Layers

1. **`<Mentions>`** — drop-in, works out of the box
2. **Compound components** — `MentionsEditor`, `MentionsPortal`, `MentionsList`, `MentionsItem`
3. **`useMentions()`** — composable with runes, full control

See the [full documentation](https://mentions.skyastrall.com/docs) for API reference and guides.

## License

[MIT](https://github.com/SkyAstrall/mentions/blob/main/LICENSE) — Built by [SkyAstrall](https://skyastrall.com)
