<script lang="ts">
	import type { Snippet } from "svelte";
	import { getMentionsContext } from "./use-mentions.svelte.js";

	interface Props {
		class?: string;
		children: Snippet;
	}

	let { class: className, children }: Props = $props();

	const ctx = getMentionsContext();
</script>

<ul
	class={className}
	id={ctx.aria.listProps.id}
	role={ctx.aria.listProps.role}
	aria-label={ctx.aria.listProps["aria-label"]}
	aria-busy={ctx.aria.listProps["aria-busy"]}
	style:list-style="none"
	style:margin="0"
	style:padding="4px 0"
	style:max-height="var(--dropdown-max-height, 240px)"
	style:overflow-y="auto"
	style:background-color="var(--dropdown-bg, white)"
	style:border="var(--dropdown-border, 1px solid #e2e8f0)"
	style:border-radius="var(--dropdown-radius, 8px)"
	style:box-shadow="var(--dropdown-shadow, 0 4px 12px rgba(0,0,0,0.08))"
	style:min-width="200px"
>
	{@render children()}
</ul>
