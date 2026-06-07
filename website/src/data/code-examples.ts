export const heroExamples: Record<string, string> = {
	react: `import { Mentions } from "@skyastrall/mentions-react"

<Mentions
  triggers={[{ char: "@", data: users }]}
  onChange={(markup, plainText) => save(markup)}
/>`,
	vue: `<script setup>
import { Mentions } from "@skyastrall/mentions-vue"
<\/script>

<template>
  <Mentions
    :triggers="[{ char: '@', data: users }]"
    v-model="markup"
  />
</template>`,
	svelte: `<script>
  import { Mentions } from "@skyastrall/mentions-svelte"
  let markup = $state("")
<\/script>

<Mentions
  triggers={[{ char: "@", data: users }]}
  value={markup}
  onChange={(m) => (markup = m)}
/>`,
	angular: `import { Component } from "@angular/core"
import { FormsModule } from "@angular/forms"
import { SaMentions } from "@skyastrall/mentions-angular"

@Component({
  standalone: true,
  imports: [SaMentions, FormsModule],
  template: \`
    <sa-mentions
      [triggers]="triggers"
      [(ngModel)]="markup"
    />
  \`,
})
export class CommentBox {
  triggers = [{ char: "@", data: this.users }]
  markup = ""
  users = [{ id: "1", label: "Alice" }]
}`,
};

export type FrameworkInfo = {
	id: string;
	label: string;
	pkg: string;
	color: string;
	soon?: boolean;
};

export const frameworks: FrameworkInfo[] = [
	{ id: "react", label: "React", pkg: "@skyastrall/mentions-react", color: "#61DAFB" },
	{ id: "vue", label: "Vue", pkg: "@skyastrall/mentions-vue", color: "#42B883" },
	{ id: "svelte", label: "Svelte", pkg: "@skyastrall/mentions-svelte", color: "#FF3E00" },
	{ id: "angular", label: "Angular", pkg: "@skyastrall/mentions-angular", color: "#DD0031" },
	{ id: "solid", label: "Solid", pkg: "@skyastrall/mentions-solid", color: "#2C4F7C", soon: true },
];
