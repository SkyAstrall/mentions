# @skyastrall/mentions-react

Multi-trigger inline suggestions for React. Drop-in component, compound components, or headless hook.

[![npm version](https://img.shields.io/npm/v/@skyastrall/mentions-react)](https://www.npmjs.com/package/@skyastrall/mentions-react)
[![bundle size](https://img.shields.io/bundlejs/size/@skyastrall/mentions-react)](https://bundlejs.com/?q=%40skyastrall%2Fmentions-react)

**[Docs](https://mentions.skyastrall.com/docs)** · **[Playground](https://mentions.skyastrall.com/playground)** · **[GitHub](https://github.com/SkyAstrall/mentions)**

## Install

```bash
npm install @skyastrall/mentions-react
```

Requires `react` >= 18.

## Quick Start

```tsx
import { Mentions } from "@skyastrall/mentions-react";

<Mentions
  triggers={[
    { char: "@", data: users, color: "rgba(99,102,241,0.25)" },
    { char: "#", data: tags, color: "rgba(16,185,129,0.25)" },
    { char: "/", data: commands, color: "rgba(245,158,11,0.25)" },
  ]}
  onChange={(markup, plainText) => console.log(markup)}
/>
```

## Features

- Multi-trigger (@mentions, #tags, /commands)
- Per-trigger highlight colors
- Ghost text / AI completions
- Async data with loading states
- Single-line mode
- Full ARIA keyboard navigation
- Controlled and uncontrolled modes
- ~5KB gzipped (~9KB core)

## API Layers

1. **`<Mentions>`** — drop-in, works out of the box
2. **Compound components** — `Mentions.Editor`, `Mentions.Portal`, `Mentions.List`, `Mentions.Item`
3. **`useMentions()`** — headless hook, full control

See the [full documentation](https://mentions.skyastrall.com/docs) for API reference and guides.

## License

[MIT](https://github.com/SkyAstrall/mentions/blob/main/LICENSE) — Built by [SkyAstrall](https://skyastrall.com)
