---
"@skyastrall/mentions-core": patch
---

Fix mention triggers after CJK text and punctuation, including `.`, `?`, and `:`, while preserving word-adjacent email suppression and blocking `/`, `-`, `#`, `&`, `=`, `+`, `~`, `@`, and backslash before triggers.
