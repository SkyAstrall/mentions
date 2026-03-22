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
    @update:model-value="save"
  />
</template>`,
	svelte: `<script>
  import { Mentions } from "@skyastrall/mentions-svelte"
<\/script>

<Mentions
  triggers={[{ char: "@", data: users }]}
  on:change={(e) => save(e.detail)}
/>`,
	solid: `import { Mentions } from "@skyastrall/mentions-solid"

<Mentions
  triggers={[{ char: "@", data: users }]}
  onChange={(markup, plainText) => save(markup)}
/>`,
	angular: `import { MentionsModule } from "@skyastrall/mentions-angular"

<mentions
  [triggers]="[{ char: '@', data: users }]"
  (change)="save($event)">
</mentions>`,
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
	{ id: "svelte", label: "Svelte", pkg: "@skyastrall/mentions-svelte", color: "#FF3E00", soon: true },
	{ id: "solid", label: "Solid", pkg: "@skyastrall/mentions-solid", color: "#2C4F7C", soon: true },
	{ id: "angular", label: "Angular", pkg: "@skyastrall/mentions-angular", color: "#DD0031", soon: true },
];
