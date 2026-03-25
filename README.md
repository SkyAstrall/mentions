# @skyastrall/mentions

Multi-trigger inline suggestions for React. @mentions, #hashtags, /commands, and custom triggers — from one tiny primitive.

[![npm version](https://img.shields.io/npm/v/@skyastrall/mentions-react)](https://www.npmjs.com/package/@skyastrall/mentions-react)
[![bundle size](https://img.shields.io/bundlejs/size/@skyastrall/mentions-react)](https://bundlejs.com/?q=%40skyastrall%2Fmentions-react)
[![license](https://img.shields.io/npm/l/@skyastrall/mentions-react)](./LICENSE)

**[Documentation](https://mentions.skyastrall.com/docs)** · **[Playground](https://mentions.skyastrall.com/playground)** · **[npm](https://www.npmjs.com/package/@skyastrall/mentions-react)**

## Install

```bash
npm install @skyastrall/mentions-react
```

## Quick Start

```tsx
import { Mentions } from "@skyastrall/mentions-react";

const users = [
  { id: "1", label: "Alice Johnson" },
  { id: "2", label: "Bob Smith" },
];

function App() {
  return (
    <Mentions
      triggers={[
        { char: "@", data: users, color: "rgba(99,102,241,0.25)" },
      ]}
      onChange={(markup, plainText) => console.log(markup)}
    />
  );
}
```

## Three API Layers

**Drop-in component** — works out of the box:

```tsx
<Mentions triggers={triggers} onChange={handleChange} />
```

**Compound components** — control the layout:

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

**Headless hook** — full control:

```tsx
const { editorRef, inputProps, isOpen, items, getItemProps } =
  useMentions({ triggers });
```

## Features

- Multi-trigger with per-trigger colors and data sources
- Contenteditable with DOM-first architecture
- Ghost text for AI inline completions (Tab to accept)
- Async data with debounce, abort, and loading states
- Single-line mode with 5-layer newline prevention
- WAI-ARIA combobox with full keyboard navigation
- Grammarly/extension defense
- Controlled and uncontrolled modes
- ~9KB core + ~5KB adapter gzipped, zero runtime dependencies in core
- React 18 and React 19

## Packages

| Package | Description |
|---------|-------------|
| [`@skyastrall/mentions-react`](https://www.npmjs.com/package/@skyastrall/mentions-react) | React adapter — component, compound components, hook |
| [`@skyastrall/mentions-core`](https://www.npmjs.com/package/@skyastrall/mentions-core) | Framework-agnostic core — state machine, parser, triggers |

## Links

- [Documentation](https://mentions.skyastrall.com/docs)
- [Interactive Playground](https://mentions.skyastrall.com/playground)
- [API Reference](https://mentions.skyastrall.com/docs/api/mentions)
- [Migration Guide (v0.1 → v0.2)](https://mentions.skyastrall.com/docs/migration/v0-1-to-v0-2)

## License

[MIT](./LICENSE) — Built by [SkyAstrall](https://skyastrall.com)
