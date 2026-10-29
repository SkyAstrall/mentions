<script lang="ts">
	import { Mentions, MentionsEditor, MentionsPortal, MentionsList, MentionsSuggestions, useMentions, type TriggerConfig } from "@skyastrall/mentions-svelte";
	let { layer, triggers }: { layer: string; triggers: TriggerConfig[] } = $props();
	const api = useMentions({ get triggers() { return triggers; } });
</script>

{#if layer === "headless"}
	<div data-mentions="">
		<div bind:this={api.editorRef} {...api.aria.inputProps} contenteditable="true" data-mentions-editor="" tabindex="0" oninput={api.handleInput} onkeydown={api.handleKeyDown} onblur={api.handleBlur} oncompositionstart={api.handleCompositionStart} oncompositionend={api.handleCompositionEnd} onpaste={api.handlePaste}></div>
		{#if api.isOpen || api.isLoading}
			<div {...api.aria.listProps} onscroll={(event) => api.handleListScroll(event.currentTarget)}>
				{#if api.groups.length}
					{#each api.groups as group, gi (group.id)}
						<div {...api.aria.getGroupProps(gi)}>
							{#if group.id !== null}<div {...api.aria.getGroupLabelProps(gi)}>{group.label}</div>{/if}
							{#each group.items as item, offset (item.id)}
								<div {...api.aria.getItemProps(group.startIndex + offset)} onpointerdown={(event) => event.preventDefault()} onclick={() => api.performInsertion(item)}>{item.label}</div>
							{/each}
						</div>
					{/each}
				{:else}
					{#each api.items as item, index (item.id)}
						<div {...api.aria.getItemProps(index)} onpointerdown={(event) => event.preventDefault()} onclick={() => api.performInsertion(item)}>{item.label}</div>
					{/each}
				{/if}
				{#if api.isLoading || api.isLoadingMore}<div role="status">Loading...</div>{/if}
			</div>
		{/if}
	</div>
{:else if layer === "compound"}
	<Mentions {triggers}><MentionsEditor /><MentionsPortal><MentionsList><MentionsSuggestions /></MentionsList></MentionsPortal></Mentions>
{:else}
	<Mentions {triggers} />
{/if}
