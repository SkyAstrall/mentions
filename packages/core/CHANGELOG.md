# @skyastrall/mentions-core

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
