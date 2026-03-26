<script lang="ts">
	import type { Snippet } from "svelte";

	interface Props {
		class?: string;
		children?: Snippet;
	}

	let { class: className, children }: Props = $props();
</script>

<div
	class={className}
	style:padding="var(--item-padding, 8px 12px)"
	style:color="#94a3b8"
	style:font-size="0.875rem"
>
	{#if children}
		{@render children()}
	{:else}
		Loading...
	{/if}
</div>
