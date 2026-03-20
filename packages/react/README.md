# @skyastrall/mentions-react

Headless React component for @mentions, slash commands, and custom triggers. Compound components + hooks. TypeScript-first.

See the [full documentation](https://github.com/SkyAstrall/mentions) for API reference, examples, and guides.

## Install

```bash
npm install @skyastrall/mentions-react
```

Requires `react` >= 18 and `react-dom` >= 18.

## Quick Start

```tsx
import { Mentions } from "@skyastrall/mentions-react";

<Mentions
  triggers={[
    { char: "@", data: users },
    { char: "#", data: tags },
    { char: "/", data: commands },
  ]}
  onSelect={(item, trigger) => console.log(trigger, item)}
/>
```

## License

[MIT](https://github.com/SkyAstrall/mentions/blob/main/LICENSE)

Built by [SkyAstrall](https://skyastrall.com).
