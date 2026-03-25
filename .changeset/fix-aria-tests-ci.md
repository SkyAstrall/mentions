---
"@skyastrall/mentions-core": patch
"@skyastrall/mentions-react": patch
"@skyastrall/mentions-vue": patch
---

Reliability fixes, new tests, and CI E2E pipeline.

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
