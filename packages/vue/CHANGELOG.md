# @skyastrall/mentions-vue

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
