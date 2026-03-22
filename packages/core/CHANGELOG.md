# @skyastrall/mentions-core

## 0.3.1

### Patch Changes

- Fix mention text color, trigger color reactivity, single-line toggle, and dropdown scroll positioning.

  - core: Add `color: var(--mention-color, inherit)` to `<mark>` elements so mention text inherits editor color instead of browser-default black
  - core: Add `restoreCursor()` utility for cursor-safe innerHTML replacement
  - react: Re-sync editor HTML when trigger config changes (e.g., color picker)
  - react: Strip existing `<br>` tags when switching to single-line mode at runtime
  - react: Add scroll listener to update dropdown caret position when page scrolls
  - vue: Same three fixes as react adapter
  - vue: Make `isSingleLine` reactive — responds to dynamic prop changes
  - vue: Pass `{ item, highlighted }` to `MentionsItem` scoped slot

## 0.3.0

### Minor Changes

- f8dd985: Headless architecture refactor — MentionController, typed ARIA, DOM utilities in core

  **Core:**

  - New `MentionController` class with subscribe/getState pattern (TanStack-style) for multi-framework support
  - State-scoped transitions — invalid actions (e.g. FETCH_COMPLETE in idle) are no-ops, preventing ghost popups
  - Typed ARIA props: `InputAriaProps`, `ListAriaProps`, `ItemAriaProps`
  - `connect()` returns pure ARIA props, requires `id` parameter (no random IDs)
  - ARIA fixes: removed `aria-selected` misuse, added `aria-busy` on listbox, Home/End keyboard support
  - DOM utilities exported: `getPlainTextFromDOM`, `getMarkupFromDOM`, `getCursorOffset`, `getCaretRect`, `insertTextAtCursor`, `buildMentionHTML`
  - Fetch staleness check includes trigger character (prevents cross-trigger result leakage)
  - Re-entrancy guard on notifications
  - Compiled regex cache in `parseMarkup`
  - Generic `MentionItem<TData>` type
  - Removed dead `QUERY_CHANGE` action

  **React:**

  - Rewritten to use `useSyncExternalStore` with `MentionController`
  - Stable callback references via refs (no unnecessary re-renders)
  - `handleInput`/`buildHTML`/`syncEditor` renamed to `_handleInput`/`_buildHTML` (internal)
  - Removed `role="textbox"` conflict with `role="combobox"` from connect
  - DOM utilities imported from core (shared with future Vue/Svelte/Solid adapters)

## 0.2.0

### Minor Changes

- Rewrite rendering from textarea+overlay to contenteditable

  ### Breaking Changes

  - `Mentions.Input` → `Mentions.Editor` (contenteditable div replaces textarea)
  - `Mentions.Overlay` removed (mentions render inline in the editor)
  - `useMentions` returns `editorRef` (RefObject<HTMLDivElement>) instead of `textareaRef`
  - `getCaretCoordinates` removed from core exports
  - `rows` prop removed from `Mentions`

  ### Features

  - DOM-first contenteditable architecture — cursor handled natively by the browser
  - Inline mention highlighting via `<mark contenteditable="false">` elements
  - CSS `::before` placeholder with JS-based empty detection
  - Single-line mode with beforeinput/keydown/paste/drop enforcement
  - Runtime `contenteditable="plaintext-only"` feature detection with fallback
  - Grammarly/extension defense (data-gramm attributes + node filtering)
  - Interactive playground page with preset themes and live code generation
  - Portal renders inline by default (CSS variables cascade naturally)

  ### Fixes

  - Dropdown no longer renders at (0,0) when caret rect unavailable
  - Enter key no longer swallowed when dropdown open but nothing highlighted
  - Overlapping regex matches across triggers no longer corrupt segments
  - `insertMention` cursor position correct when no trailing space needed
  - `ESCAPE`/`BLUR`/`FETCH_ERROR` properly reset query indices
  - Async fetch results discarded when query changed during debounce
  - `onBlur` uses `closest("[data-mentions]")` instead of fragile `parentElement`
