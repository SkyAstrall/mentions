<script lang="ts">
	import type { Snippet } from "svelte";
	import { getMentionsContext } from "./use-mentions.svelte.js";

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	const ctx = getMentionsContext();
	const isOpen = $derived(ctx.state.status === "suggesting" || ctx.state.status === "navigating");
</script>

{#if isOpen || ctx.state.status === "loading"}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		role="presentation"
		data-mentions-portal=""
		data-mentions=""
		onmousedown={(e) => e.preventDefault()}
		style:position="fixed"
		style:z-index="9999"
		style:top={ctx.state.caretPosition ? `${ctx.state.caretPosition.top + ctx.state.caretPosition.height + 4}px` : undefined}
		style:left={ctx.state.caretPosition ? `${ctx.state.caretPosition.left}px` : undefined}
	>
		{@render children()}
	</div>
{/if}
