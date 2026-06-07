# @skyastrall/mentions-angular

Signal-native, zoneless-ready Angular adapter for `@mentions`, `#tags`, `/commands`, and any custom trigger. Drop-in standalone component with `ControlValueAccessor` for forms.

[![npm version](https://img.shields.io/npm/v/@skyastrall/mentions-angular)](https://www.npmjs.com/package/@skyastrall/mentions-angular)

**[Docs](https://mentions.skyastrall.com/docs)** · **[Playground](https://mentions.skyastrall.com/playground?fw=angular)** · **[GitHub](https://github.com/SkyAstrall/mentions)**

## Install

```bash
npm install @skyastrall/mentions-angular
```

Requires `@angular/core`, `@angular/common`, `@angular/forms` `>= 21.0.0 < 23.0.0` (Angular 21 / 22).

## Quick Start

```ts
import { Component, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { SaMentions, type TriggerConfig } from "@skyastrall/mentions-angular";

@Component({
  selector: "comment-box",
  standalone: true,
  imports: [SaMentions, FormsModule],
  template: `
    <sa-mentions
      [triggers]="triggers()"
      [(ngModel)]="markup"
      placeholder="Type @ to mention someone"
    />
  `,
})
export class CommentBox {
  triggers = signal<TriggerConfig[]>([
    { char: "@", data: [{ id: "1", label: "Alice" }, { id: "2", label: "Bob" }] },
    { char: "#", data: [{ id: "t1", label: "design" }, { id: "t2", label: "bug" }] },
  ]);
  markup = signal("");
}
```

## Inputs

| Input | Type | Default | Notes |
|---|---|---|---|
| `triggers` | `TriggerConfig[]` | **required** | One entry per trigger character |
| `value` (via `[(ngModel)]` or `[(value)]`) | `string` | `""` | Two-way bindable markup |
| `placeholder` | `string` | `""` | Shown when editor is empty |
| `singleLine` | `boolean` | `false` | Suppresses line breaks |
| `disabled` | `boolean` | `false` | Disables the editor |
| `readOnly` | `boolean` | `false` | Makes the editor non-editable but focusable |
| `ghostText` | `string` | `""` | Dimmed inline completion; **Tab** accepts it |
| `autoFocus` | `boolean` | `false` | Focus on first render |

## Outputs

| Output | Payload | Fired when |
|---|---|---|
| `mentionInsert` | `{ item, trigger }` | An item is picked from the dropdown |
| `mentionRemove` | `{ item, trigger }` | An existing mention is deleted |
| `opened` | `string` (trigger char) | Dropdown opens |
| `closed` | `void` | Dropdown closes |
| `acceptGhostText` | `void` | **Tab** accepts the ghost text |

## Forms integration

`SaMentions` implements `ControlValueAccessor`, so it works as a drop-in with both forms APIs:

```ts
// Reactive forms
this.form = new FormGroup({ comment: new FormControl("") });
```

```html
<form [formGroup]="form">
  <sa-mentions [triggers]="triggers()" formControlName="comment" />
</form>
```

## Component handle (imperative API)

Grab a `viewChild` reference and call methods directly:

```ts
@Component({
  template: `<sa-mentions #m [triggers]="triggers()" /> <button (click)="m.insertText('👍')">👍</button>`,
})
class Demo {
  // …
}
```

| Method | Use |
|---|---|
| `focus()` | Move focus into the editor |
| `clear()` | Reset markup to empty |
| `getValue()` | `{ markup, plainText }` snapshot |
| `insertTrigger(char)` | Programmatically open the dropdown for a trigger |
| `insertText(text)` | Insert arbitrary text at the caret (emoji, slash output, AI completion, …) |

## Global config

Provide repo-wide defaults at the application level:

```ts
import { bootstrapApplication } from "@angular/platform-browser";
import { provideMentions } from "@skyastrall/mentions-angular";

bootstrapApplication(AppRoot, {
  providers: [
    provideMentions({
      // Custom filter (default is substring + label match)
      filterFn: (items, query) =>
        items.filter((it) => it.label.toLowerCase().includes(query.toLowerCase())),
      // Surface errors from async data sources
      onError: (err) => console.error("[mentions]", err),
    }),
  ],
});
```

## Server-side helpers

For pure data work (SSR rendering, search indexing, etc.), import from core — no Angular runtime required:

```ts
import { extractMentions, parseMarkup } from "@skyastrall/mentions-core";

const triggers = [{ char: "@", data: [] }];
const mentions = extractMentions("Hi @alice and @bob", triggers);
```

## Features

- Standalone component (no NgModule)
- Signal-based reactivity (`input.required`, `model()`, `output()`)
- Zoneless-ready (no `NgZone` dependency)
- `ControlValueAccessor` for `[(ngModel)]` and reactive forms
- Per-trigger highlight colors
- Async data with loading states
- Single-line mode
- Full ARIA keyboard navigation
- ~5 KB minified + gzipped (~6 KB core)

See the [full documentation](https://mentions.skyastrall.com/docs) for the complete API reference and guides.

## License

[MIT](https://github.com/SkyAstrall/mentions/blob/main/LICENSE) — Built by [SkyAstrall](https://skyastrall.com)
