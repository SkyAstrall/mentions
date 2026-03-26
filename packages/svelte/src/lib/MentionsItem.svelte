<script lang="ts">
	import type { Snippet } from "svelte";
	import type { MentionItem } from "@skyastrall/mentions-core";
	import { getMentionsContext } from "./use-mentions.svelte.js";

	interface Props {
		index: number;
		class?: string;
		children?: Snippet<[{ item: MentionItem; highlighted: boolean }]>;
	}

	let { index, class: className, children }: Props = $props();

	const ctx = getMentionsContext();
	const item = $derived(ctx.state.items[index]);
	const highlighted = $derived(index === ctx.state.highlightedIndex);
	const itemProps = $derived(ctx.aria.getItemProps(index));

	let li: HTMLLIElement;

	$effect(() => {
		if (highlighted && li) {
			li.scrollIntoView({ block: "nearest" });
		}
	});
</script>

{#if item}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<li
		bind:this={li}
		class={className}
		id={itemProps.id}
		role={itemProps.role}
		aria-selected={itemProps["aria-selected"]}
		onpointerdown={(e) => e.preventDefault()}
		onclick={() => ctx.performInsertion(item)}
		style:padding="var(--item-padding, 8px 12px)"
		style:cursor="pointer"
		style:background-color={highlighted ? "var(--item-active-bg, #f1f5f9)" : "transparent"}
	>
		{#if children}
			{@render children({ item, highlighted })}
		{:else}
			{item.label}
		{/if}
	</li>
{/if}
