# Changelog

All notable changes to `@skyastrall/mentions` packages. Per-package changelogs live alongside their source — this file aggregates the release-level story.

- [`@skyastrall/mentions-core`](./packages/core/CHANGELOG.md)
- [`@skyastrall/mentions-react`](./packages/react/CHANGELOG.md)
- [`@skyastrall/mentions-vue`](./packages/vue/CHANGELOG.md)
- [`@skyastrall/mentions-svelte`](./packages/svelte/CHANGELOG.md)
- [`@skyastrall/mentions-angular`](./packages/angular/CHANGELOG.md)

The repo follows [semver](https://semver.org/). Releases are tagged in `pkg-name@version` form (changesets convention) plus an umbrella `v0.x.y` tag per release.

---

## v0.5.0 — 2026-06-05

**New: `@skyastrall/mentions-angular`** — Angular 21+ adapter with signal-based reactivity (`input.required`, `model`, `output`), `ControlValueAccessor` for `[(ngModel)]` and reactive forms, and a standalone `<sa-mentions>` component. Zoneless-ready. First npm release.

Across all adapters this release also lands:

- **Large-paste fast path** — pasting thousands of lines no longer freezes the page; large pastes insert as a single text node (~25 ms for 5,000 lines) with one-step undo, and trigger detection is bounded near the cursor.
- **Block line breaks preserved** — Enter is stored as `<div>` blocks; serialization now emits `\n` at block boundaries instead of only recognizing `<br>`.
- **SSR-safe editor mode** — `plaintext-only` detection runs client-side after mount, fixing Next.js / Nuxt / Astro SSR.
- **`insertText(text)`** on every adapter handle, sharing the large-paste fast path.
- **React** ships `'use client'`; the imperative `ref` handle works on React 18 and 19; compound prop types are exported flat.
- **Vue** `.d.ts` emits real `DefineComponent<…>` declarations with typed `emits`.
- **Core** exports `./effects.css` for all adapters.
- **engines** tightened to `^20.19.0 || >=22.12.0`; the `@types/react` peer is now `^18 || ^19`.
- Multi-framework infrastructure — namespaced label taxonomy, framework-aware issue/feature templates, CODEOWNERS, multi-framework `README.md` / `CONTRIBUTING.md` / `website/README.md`.

Packages: `core@0.5.0`, `react@0.5.0`, `vue@0.5.0`, `svelte@0.5.0`, `angular@0.5.0` (`angular` initial).

## v0.4.0 — 2026-03-26

**Svelte 5 adapter.**

- New `@skyastrall/mentions-svelte` package — Svelte 5 adapter with `useMentions` composable and 7 compound components
- Uses `$state`, `$derived`, `$effect` runes for reactive controller subscription
- Snippets for item customization (replaces deprecated slots)
- Full E2E test suite (20 Playwright tests) + 19 unit tests
- Built with `@sveltejs/package`, ships preprocessed `.svelte` + `.js` + `.d.ts`
- Website: Svelte examples added to every docs page; playground supports React / Vue / Svelte side-by-side

Packages: `core@0.4.0`, `react@0.4.0`, `vue@0.4.0`, `svelte@0.4.0` (initial).

## v0.3.2 — 2026-03-25

**Reliability + CI E2E.**

- core: Add `aria-selected` to highlighted options in `connect()` (required by VoiceOver+Chrome)
- core: Comprehensive tests for `connect.ts` (39 tests) and `dom.ts` (51 tests)
- react: Memoize context value with `useMemo` to prevent unnecessary subtree re-renders
- react: Surface `performMentionInsertion` failure via `onError` callback instead of silent return
- vue: Replace global instance counter with `useId()` (Vue 3.5+)
- vue: Fix RAF cleanup in `onScopeDispose` to prevent memory leaks on unmount
- vue: Consolidate duplicate `watch(options.triggers)` into single watcher
- infra: Playwright E2E job added to CI (Chromium, retries, blob reporter)

Packages: `core@0.3.2`, `react@0.3.2`, `vue@0.3.2`.

## v0.3.1 — 2026-03-22

**Color / scroll / single-line polish.**

- core: `<mark>` elements inherit editor color via `color: var(--mention-color, inherit)` (fixes black-text-on-dark-theme)
- core: `restoreCursor()` utility for cursor-safe innerHTML replacement
- react / vue: Re-sync editor HTML when trigger config changes (e.g. live color picker)
- react / vue: Strip existing `<br>` when toggling single-line mode at runtime
- react / vue: Scroll listener keeps dropdown caret-aligned during page scroll
- vue: `isSingleLine` reactive to dynamic prop changes
- vue: `MentionsItem` scoped slot receives `{ item, highlighted }`

Packages: `core@0.3.1`, `react@0.3.1`, `vue@0.3.1`.

## v0.3.0 — 2026-03-21

**Headless architecture refactor.** First Vue adapter ships.

- New `MentionController` class with subscribe / getState pattern (TanStack-style) for multi-framework support
- State-scoped transitions — invalid actions are no-ops, preventing ghost popups
- Typed ARIA props: `InputAriaProps`, `ListAriaProps`, `ItemAriaProps`
- `connect()` returns pure ARIA props, requires explicit `id` (no random IDs)
- ARIA fixes: removed `aria-selected` misuse, added `aria-busy` on listbox, Home/End keyboard support
- DOM utilities exported from core (shared by all adapters)
- Fetch staleness check includes trigger character (prevents cross-trigger result leakage)
- Re-entrancy guard on notifications
- Compiled regex cache in `parseMarkup`
- Generic `MentionItem<TData>` type
- React: rewritten to `useSyncExternalStore` with `MentionController`
- Vue: new `@skyastrall/mentions-vue` package — Vue 3 composable + components

Packages: `core@0.3.0`, `react@0.3.0`, `vue@0.3.0` (initial).

## v0.2.0 — 2026-03-21

**Contenteditable rewrite. Breaking.**

**Breaking changes**
- `Mentions.Input` → `Mentions.Editor` (contenteditable div replaces textarea)
- `Mentions.Overlay` removed (mentions render inline in the editor)
- `useMentions` returns `editorRef: RefObject<HTMLDivElement>` instead of `textareaRef`
- `getCaretCoordinates` removed from core exports
- `rows` prop removed from `Mentions`

**Features**
- DOM-first contenteditable architecture — cursor handled natively by the browser
- Inline mention highlighting via `<mark contenteditable="false">`
- Single-line mode with beforeinput/keydown/paste/drop enforcement
- Runtime `contenteditable="plaintext-only"` feature detection with fallback
- Grammarly/extension defense (data-gramm attributes + node filtering)
- Interactive playground page with preset themes and live code generation

**Fixes**
- Dropdown no longer renders at (0,0) when caret rect unavailable
- Enter key no longer swallowed when dropdown open but nothing highlighted
- Overlapping regex matches across triggers no longer corrupt segments
- Async fetch results discarded when query changed during debounce

Packages: `core@0.2.0`, `react@0.2.0`.

## v0.1.0 — 2026-03-20

Initial public release.

- `@skyastrall/mentions-core` — framework-agnostic engine, state machine, parser, trigger detection
- `@skyastrall/mentions-react` — React 18/19 adapter with drop-in `<Mentions>` and `useMentions` hook
- Textarea + overlay rendering, debounced async fetch, controlled / uncontrolled modes
- ~9 KB core + ~5 KB adapter gzipped

Packages: `core@0.1.0`, `react@0.1.0`.

---

For full per-commit detail, see each package's CHANGELOG linked at the top.
