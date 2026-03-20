# @skyastrall/mentions

Trigger-based inline suggestions for React. Mentions, hashtags, slash commands, and custom triggers with full TypeScript support.

[![npm version](https://img.shields.io/npm/v/@skyastrall/mentions-react)](https://www.npmjs.com/package/@skyastrall/mentions-react)
[![bundle size](https://img.shields.io/bundlejs/size/@skyastrall/mentions-react)](https://bundlejs.com/?q=%40skyastrall%2Fmentions-react)
[![build](https://img.shields.io/github/actions/workflow/status/skyAstrall/mentions/ci.yml)](https://github.com/skyAstrall/mentions/actions)
[![license](https://img.shields.io/npm/l/@skyastrall/mentions-react)](./LICENSE)

## Install

```bash
npm install @skyastrall/mentions-react
```

Requires `react` >= 18 and `react-dom` >= 18. Works with Next.js, Remix, Vite, and any React project.

## Why this library

- **react-mentions is abandoned.** No updates since 2023, no React 19 support, no TypeScript-first API.
- **Multi-trigger by default.** `@users`, `#tags`, `/commands` -- each with its own color, data source, and behavior.
- **AI-ready.** Built-in ghost text for inline completions. Wire up any LLM in 5 lines.
- **Three layers of control.** Drop-in component, compound components, or a fully headless hook. Pick your level.

## Quick Start

The simplest way to get started. One component, zero configuration beyond your triggers.

```tsx
import { Mentions } from "@skyastrall/mentions-react";

const users = [
  { id: "1", label: "Alice Johnson" },
  { id: "2", label: "Bob Smith" },
];

function App() {
  return (
    <Mentions
      triggers={[{ char: "@", data: users }]}
      onChange={(markup, plainText) => console.log(markup, plainText)}
    />
  );
}
```

## Compound Components

Full control over layout while the library handles state, ARIA, and keyboard navigation.

```tsx
import { Mentions } from "@skyastrall/mentions-react";

<Mentions triggers={triggers}>
  <Mentions.Overlay />
  <Mentions.Input placeholder="Type @ to mention..." />
  <Mentions.Portal>
    <Mentions.List>
      <Mentions.Item render={({ item, highlighted }) => (
        <div style={{ fontWeight: highlighted ? 600 : 400 }}>
          {item.label}
        </div>
      )} />
    </Mentions.List>
  </Mentions.Portal>
</Mentions>
```

## Headless Hook

For complete UI ownership. You get props, state, and helpers -- render whatever you want.

```tsx
import { useMentions } from "@skyastrall/mentions-react";

function Editor() {
  const {
    inputProps, listProps, getItemProps,
    isOpen, items, highlightedIndex, textareaRef, caretPosition,
  } = useMentions({ triggers: [{ char: "@", data: users }] });

  return (
    <div style={{ position: "relative" }}>
      <textarea ref={textareaRef} {...inputProps} />
      {isOpen && items.length > 0 && (
        <ul {...listProps}>
          {items.map((item, i) => (
            <li key={item.id} {...getItemProps(i)}>{item.label}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

## Features

- Per-trigger highlight colors
- Ghost text / AI inline completions (Tab to accept)
- Async data sources with loading states
- `minChars` and `maxSuggestions` per trigger
- `singleLine` mode (renders `<input>` instead of `<textarea>`)
- Toolbar buttons via `insertTrigger()` and `insertText()`
- `onRemove` callback when a mention is deleted
- Programmatic control: `focus()`, `clear()`, `getValue()`, `insertText()`
- CSS effects: gradient borders, glow, shimmer, animations
- WhatsApp-style formatting (`*bold*`, `_italic_`, `~strikethrough~`)
- Full ARIA: `listbox`, `option`, `aria-activedescendant`, keyboard navigation
- Controlled and uncontrolled modes
- `disabled` and `readOnly` support
- React 18 and React 19

## Comparison

| Feature | @skyastrall/mentions | react-mentions | react-mentions-ts |
|---------|---------------------|----------------|-------------------|
| Maintained | Yes | No (abandoned) | Sporadic |
| React 19 | Yes | No | Partial |
| TypeScript-first | Yes | No (DefinitelyTyped) | Yes |
| Multiple triggers | Yes | Yes | Yes |
| Per-trigger colors | Yes | No | No |
| Ghost text / AI | Yes | No | No |
| Headless hook | Yes | No | No |
| Compound components | Yes | No | No |
| Single-line mode | Yes | Yes | Yes |
| Async data | Yes | Yes | Yes |
| Toolbar / programmatic | Yes | No | No |
| onRemove callback | Yes | No | No |
| CSS effects | Yes | No | No |
| WhatsApp formatting | Yes | No | No |
| ARIA compliant | Yes | Partial | Partial |

## API Reference

### `<Mentions>` Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `triggers` | `TriggerConfig[]` | required | Trigger configurations |
| `value` | `string` | -- | Controlled markup value |
| `defaultValue` | `string` | `""` | Initial markup (uncontrolled) |
| `onChange` | `(markup, plainText) => void` | -- | Fires on every change |
| `onSelect` | `(item, trigger) => void` | -- | Fires when a mention is inserted |
| `onRemove` | `(item, trigger) => void` | -- | Fires when a mention is deleted |
| `onQueryChange` | `(query, trigger) => void` | -- | Fires as the user types after a trigger |
| `onOpen` | `(trigger) => void` | -- | Fires when the suggestion dropdown opens |
| `onClose` | `() => void` | -- | Fires when the dropdown closes |
| `onError` | `(error) => void` | -- | Fires on async data fetch errors |
| `placeholder` | `string` | -- | Input placeholder text |
| `className` | `string` | -- | CSS class on the wrapper `div` |
| `disabled` | `boolean` | `false` | Disables the input |
| `readOnly` | `boolean` | `false` | Makes the input read-only |
| `autoFocus` | `boolean` | `false` | Auto-focuses on mount |
| `rows` | `number` | -- | Textarea rows |
| `singleLine` | `boolean` | `false` | Renders `<input>` instead of `<textarea>` |
| `renderItem` | `(item, highlighted) => ReactNode` | -- | Custom suggestion item renderer |
| `ghostText` | `string` | -- | Dimmed inline suggestion after cursor |
| `onAcceptGhostText` | `() => void` | -- | Fires when Tab accepts ghost text |
| `ref` | `Ref<MentionsHandle>` | -- | Imperative handle |

### `MentionsHandle` (ref methods)

| Method | Signature | Description |
|--------|-----------|-------------|
| `focus` | `() => void` | Focuses the input |
| `clear` | `() => void` | Clears all content |
| `getValue` | `() => { markup, plainText }` | Returns current values |
| `insertText` | `(text: string) => void` | Inserts text at cursor |
| `insertTrigger` | `(trigger: string) => void` | Inserts trigger char and opens dropdown |

### `useMentions(options)` Return Value

| Property | Type | Description |
|----------|------|-------------|
| `inputProps` | `object` | Spread onto `<textarea>` or `<input>` |
| `listProps` | `object` | Spread onto the suggestion `<ul>` |
| `getItemProps` | `(index) => object` | Props for each `<li>` item |
| `isOpen` | `boolean` | Whether the dropdown is visible |
| `isLoading` | `boolean` | Whether an async fetch is in progress |
| `items` | `MentionItem[]` | Current suggestion items |
| `highlightedIndex` | `number` | Currently highlighted item index |
| `activeTrigger` | `string \| null` | The active trigger character |
| `caretPosition` | `CaretPosition \| null` | Caret coordinates for dropdown positioning |
| `state` | `MentionState` | Full state machine state |
| `textareaRef` | `RefObject` | Ref to attach to your textarea/input |
| `overlayRef` | `RefObject` | Ref for the highlight overlay div |
| `markup` | `string` | Current markup string |
| `plainText` | `string` | Current plain text string |
| `mentions` | `MentionItem[]` | All active mentions extracted from markup |
| `clear` | `() => void` | Clears all content |
| `focus` | `() => void` | Focuses the input |
| `insertTrigger` | `(trigger) => void` | Inserts a trigger and opens dropdown |
| `ghostText` | `string \| undefined` | Current ghost text value |

## Trigger Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `char` | `string` | required | Trigger character (`@`, `#`, `/`, etc.) |
| `data` | `MentionItem[] \| (query, context) => Promise<MentionItem[]>` | required | Static array or async fetcher |
| `markup` | `string` | `"@[__display__](__id__)"` | Markup template for serialized mentions |
| `allowSpaceInQuery` | `boolean` | `false` | Allow spaces in the search query |
| `debounce` | `number` | `200` | Debounce delay (ms) for async data |
| `minChars` | `number` | `0` | Minimum characters before suggestions appear |
| `maxSuggestions` | `number` | -- | Maximum number of suggestions shown |
| `color` | `string` | -- | Highlight background color for this trigger |

### MentionItem

```typescript
type MentionItem = {
  id: string;
  label: string;
  [key: string]: unknown; // pass through any extra fields
};
```

### Async Data with Context

The async fetcher receives a `MentionContext` object as the second argument:

```typescript
type MentionContext = {
  textBefore: string;
  textAfter: string;
  activeMentions: MentionItem[];
  fullText: string;
};

const triggers = [{
  char: "@",
  data: async (query: string, context: MentionContext) => {
    const res = await fetch(`/api/users?q=${query}`);
    return res.json();
  },
  debounce: 300,
}];
```

## CSS Variables

Style the component by setting CSS custom properties on the `[data-mentions]` wrapper.

| Variable | Default | Description |
|----------|---------|-------------|
| `--mention-bg` | `oklch(0.93 0.03 250)` | Default mention highlight background |
| `--mention-radius` | `3px` | Mention highlight border radius |
| `--dropdown-bg` | `white` | Dropdown background |
| `--dropdown-border` | `1px solid #e2e8f0` | Dropdown border |
| `--dropdown-radius` | `8px` | Dropdown border radius |
| `--dropdown-shadow` | `0 4px 12px rgba(0,0,0,0.08)` | Dropdown box shadow |
| `--dropdown-max-height` | `240px` | Dropdown max height |
| `--item-padding` | `8px 12px` | Suggestion item padding |
| `--item-active-bg` | `#f1f5f9` | Highlighted item background |
| `--ghost-text-color` | `rgba(0, 0, 0, 0.3)` | Ghost text color |

## CSS Effects

Optional visual effects. Import the stylesheet and add classes to the `<Mentions>` wrapper.

```tsx
import "@skyastrall/mentions-react/effects.css";

<Mentions className="mentions-gradient-border" triggers={triggers} />
<Mentions className="mentions-glow" triggers={triggers} />
<Mentions className="mentions-shimmer" triggers={triggers} />
<Mentions className="mentions-animate" triggers={triggers} />
```

| Class | Effect |
|-------|--------|
| `mentions-gradient-border` | Animated conic gradient border on focus |
| `mentions-glow` | Soft glow shadow on focus |
| `mentions-shimmer` | Shimmer animation on placeholder text |
| `mentions-animate` | Smooth dropdown entry and mention highlight animations |

Effects CSS variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `--mentions-gradient-from` | `#687aff` | Gradient start color |
| `--mentions-gradient-to` | `#b3beff` | Gradient end color |
| `--mentions-glow-color` | `#3b82f6` | Glow color |
| `--mentions-animate-speed` | `0.25s` | Animation duration |

## Ghost Text / AI Completions

Wire up any AI or autocomplete backend using `ghostText` and `onAcceptGhostText`.

```tsx
function AIEditor() {
  const [ghost, setGhost] = useState("");

  const handleChange = (_markup: string, plainText: string) => {
    // Call your AI backend here
    fetchCompletion(plainText).then(setGhost);
  };

  return (
    <Mentions
      triggers={[{ char: "@", data: users }]}
      ghostText={ghost}
      onChange={handleChange}
      onAcceptGhostText={() => setGhost("")}
    />
  );
}
```

The ghost text appears dimmed after the cursor. Press Tab to accept it into the input.

## Utility Functions

Re-exported from `@skyastrall/mentions-core`:

```typescript
import { extractMentions, markupToPlainText, parseMarkup } from "@skyastrall/mentions-react";

// Extract all mentions from markup
const mentions = extractMentions(markup, triggers);

// Convert markup to plain text
const plain = markupToPlainText(markup, triggers);

// Parse markup into segments (text + mention)
const segments = parseMarkup(markup, triggers);
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE)

Built by [SkyAstrall](https://skyastrall.com).
