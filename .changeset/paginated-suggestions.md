---
"@skyastrall/mentions-core": minor
"@skyastrall/mentions-react": minor
"@skyastrall/mentions-vue": minor
"@skyastrall/mentions-svelte": minor
"@skyastrall/mentions-angular": minor
---

Add cursor-based async suggestion pages across all adapters. Load more by scrolling or moving past the last loaded item, retain suggestions and highlighting while loading, expose loading-more state and aria-busy, and cancel stale pages. Array sources remain supported.

Angular synchronously renders and scrolls the active option into view when highlighting or page items change, including asynchronous page completions.

Increase the core gzip budget from 7 kB to 8 kB (+1 kB) for grouping, pagination, cancellation and page validation. Supplemental esbuild measurement on 2026-10-28 is approximately 7.6 kB; adapter budgets are unchanged and core has no runtime dependencies.
