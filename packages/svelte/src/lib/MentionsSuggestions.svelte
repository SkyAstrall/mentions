<script lang="ts">
	import type { MentionItem } from "@skyastrall/mentions-core";
	import type { Snippet } from "svelte";
	import { getMentionsContext } from "./context.js";
	import MentionsGroup from "./MentionsGroup.svelte";
	import MentionsGroupLabel from "./MentionsGroupLabel.svelte";
	import MentionsItem from "./MentionsItem.svelte";
	let { renderItem }: { renderItem?: Snippet<[{ item: MentionItem; highlighted: boolean }]> } = $props();
	const ctx = getMentionsContext();
</script>

{#snippet items(list: MentionItem[], startIndex: number)}
	{#each list as item, offset (item.id)}
		<MentionsItem index={startIndex + offset}>
			{#snippet children(props)}
				{#if renderItem}{@render renderItem(props)}{:else}{props.item.label}{/if}
			{/snippet}
		</MentionsItem>
	{/each}
{/snippet}

{#if ctx.aria.groups.length}
	{#each ctx.aria.groups as group, index (group.id)}
		{#if group.id === null}
			{@render items(group.items, group.startIndex)}
		{:else}
			<MentionsGroup {index}><MentionsGroupLabel {index} />{@render items(group.items, group.startIndex)}</MentionsGroup>
		{/if}
	{/each}
{:else}
	{@render items(ctx.aria.items, 0)}
{/if}
{#if ctx.aria.isLoadingMore}<li role="status">Loading...</li>{/if}
