# @skyastrall/mentions-angular

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
