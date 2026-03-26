<script lang="ts">
	import type { Snippet } from "svelte";
	import { getMentionsContext } from "./use-mentions.svelte.js";

	interface Props {
		class?: string;
		children?: Snippet;
	}

	let { class: className, children }: Props = $props();

	const ctx = getMentionsContext();
</script>

{#if ctx.state.items.length === 0}
	<div
		class={className}
		style:padding="var(--item-padding, 8px 12px)"
		style:color="#94a3b8"
		style:font-size="0.875rem"
	>
		{#if children}
			{@render children()}
		{:else}
			No results
		{/if}
	</div>
{/if}
