# @skyastrall/mentions-react

## 0.5.0

### Minor Changes

- Initial release of `@skyastrall/mentions-angular` — Angular 21+ adapter with signal-based reactivity (`input.required`, `model`, `output`), `ControlValueAccessor` for `[(ngModel)]` and reactive forms, and a standalone `<sa-mentions>` component. Zoneless-ready.

  Across all adapters this release also lands:

  - **Large-paste fast path.** Pasting thousands of lines used to freeze the page for 30+ seconds — the browser's native multi-line insertion is superlinear in line count. Large pastes are now intercepted and inserted as a single text node (~25ms for 5,000 lines), with a one-step undo for the paste. Trigger detection is also bounded near the cursor, so typing stays fast in any document size.
  - **Line breaks are no longer lost.** Browsers represent Enter as `<div>` blocks; serialization previously only recognized `<br>`, silently gluing lines together. Block boundaries now serialize as `\n` everywhere.
  - **SSR-safe editor mode.** The `plaintext-only` detection ran during server rendering (where it always fails) and the wrong mode survived hydration. Detection now happens client-side after mount, fixing Next.js / Nuxt / Astro SSR usage.
  - **`insertText(text)`** on every adapter handle — programmatically insert text at the caret (emoji, AI completions, slash output). Large inserts take the same fast path as paste.
  - **React** ships a `'use client'` directive, so `<Mentions>` and `useMentions()` work directly in Next.js App Router client components. The imperative `ref` handle now works on React 18 as well as 19 (it was silently `null` on 18). Compound prop types are exported flat (`MentionsEditorProps`, `MentionsListProps`, …).
  - **Vue** `.d.ts` emission now produces real `DefineComponent<…>` declarations for every component instead of `declare const X: any`, and `emits` are typed end-to-end.
  - **Core** exports `./effects.css` directly, so all adapters can `import "@skyastrall/mentions-core/effects.css"`.
  - **engines** policy tightened to `^20.19.0 || >=22.12.0`; Node 18 reached EOL in April 2025 and is no longer supported. The `@types/react` peer is now `^18 || ^19` (was `*`).

### Patch Changes

- Updated dependencies
  - @skyastrall/mentions-core@0.5.0

## 0.4.0

### Minor Changes

- 77db4d4: Version-aligned with the v0.4.0 monorepo release line. No public API or behavior changes in `react`. See [`packages/svelte/CHANGELOG.md`](../svelte/CHANGELOG.md) for the Svelte 5 adapter that shipped under this version.

### Patch Changes

- Updated dependencies [77db4d4]
  - @skyastrall/mentions-core@0.4.0

## 0.3.2

### Patch Changes

- e5f2a06: Reliability fixes, new tests, and CI E2E pipeline.

  - core: Add `aria-selected` to highlighted options in `connect()` (required by VoiceOver+Chrome)
  - core: Add comprehensive tests for `connect.ts` (39 tests) and `dom.ts` (51 tests)
  - react: Memoize context value with `useMemo` to prevent unnecessary subtree re-renders
  - react: Remove stale `as unknown as boolean` type cast for `contentEditable="plaintext-only"`
  - react: Surface `performMentionInsertion` failure via `onError` callback instead of silent return
  - vue: Replace global instance counter with `useId()` (Vue 3.5+)
  - vue: Fix RAF cleanup in `onScopeDispose` to prevent memory leaks on unmount
  - vue: Consolidate duplicate `watch(options.triggers)` into single watcher
  - vue: Surface `performMentionInsertion` failure via `onError` callback instead of silent return
  - infra: Add Playwright E2E job to CI pipeline (Chromium, retries in CI, blob reporter)

- Updated dependencies [e5f2a06]
  - @skyastrall/mentions-core@0.3.2

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

- Updated dependencies
  - @skyastrall/mentions-core@0.3.1

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

### Patch Changes

- Updated dependencies [f8dd985]
  - @skyastrall/mentions-core@0.3.0

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

### Patch Changes

- Updated dependencies
  - @skyastrall/mentions-core@0.2.0
