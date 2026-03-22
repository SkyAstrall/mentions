# @skyastrall/mentions-vue

Multi-trigger inline suggestions for Vue 3. Drop-in component, compound components, or composable.

[![npm version](https://img.shields.io/npm/v/@skyastrall/mentions-vue)](https://www.npmjs.com/package/@skyastrall/mentions-vue)
[![bundle size](https://img.shields.io/bundlejs/size/@skyastrall/mentions-vue)](https://bundlejs.com/?q=%40skyastrall%2Fmentions-vue)

**[Docs](https://mentions.skyastrall.com/docs)** · **[Playground](https://mentions.skyastrall.com/playground?fw=vue)** · **[GitHub](https://github.com/SkyAstrall/mentions)**

## Install

```bash
npm install @skyastrall/mentions-vue
```

Requires `vue` >= 3.4.

## Quick Start

```vue
<script setup>
import { ref } from "vue";
import { Mentions } from "@skyastrall/mentions-vue";

const markup = ref("");
</script>

<template>
  <Mentions
    :triggers="[
      { char: '@', data: users, color: 'rgba(99,102,241,0.25)' },
      { char: '#', data: tags, color: 'rgba(16,185,129,0.25)' },
      { char: '/', data: commands, color: 'rgba(245,158,11,0.25)' },
    ]"
    v-model="markup"
  />
</template>
```

## Features

- Multi-trigger (@mentions, #tags, /commands)
- Per-trigger highlight colors
- Ghost text / AI completions
- Async data with loading states
- Single-line mode
- Full ARIA keyboard navigation
- Controlled and uncontrolled modes
- ~5KB gzipped (~9KB core)

## API Layers

1. **`<Mentions>`** — drop-in, works out of the box
2. **Compound components** — `MentionsEditor`, `MentionsPortal`, `MentionsList`, `MentionsItem`
3. **`useMentions()`** — composable, full control

See the [full documentation](https://mentions.skyastrall.com/docs) for API reference and guides.

## License

[MIT](https://github.com/SkyAstrall/mentions/blob/main/LICENSE) — Built by [SkyAstrall](https://skyastrall.com)
