---
"@skyastrall/mentions-core": minor
"@skyastrall/mentions-react": minor
---

Headless architecture refactor — MentionController, typed ARIA, DOM utilities in core

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
