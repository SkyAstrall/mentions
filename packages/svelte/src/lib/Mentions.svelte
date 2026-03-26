<script lang="ts">
	import type { Snippet } from "svelte";
	import type { MentionItem, TriggerConfig, MentionCallbacks } from "@skyastrall/mentions-core";
	import { useMentions, setMentionsContext, type MentionsContext } from "./use-mentions.svelte.js";
	import MentionsEditor from "./MentionsEditor.svelte";
	import MentionsPortal from "./MentionsPortal.svelte";
	import MentionsList from "./MentionsList.svelte";
	import MentionsItem from "./MentionsItem.svelte";
	import MentionsEmpty from "./MentionsEmpty.svelte";
	import MentionsLoading from "./MentionsLoading.svelte";

	interface Props {
		triggers: TriggerConfig[];
		value?: string;
		defaultValue?: string;
		onChange?: MentionCallbacks["onChange"];
		onSelect?: MentionCallbacks["onSelect"];
		onRemove?: MentionCallbacks["onRemove"];
		onQueryChange?: MentionCallbacks["onQueryChange"];
		onOpen?: MentionCallbacks["onOpen"];
		onClose?: MentionCallbacks["onClose"];
		onError?: MentionCallbacks["onError"];
		placeholder?: string;
		class?: string;
		disabled?: boolean;
		readOnly?: boolean;
		autoFocus?: boolean;
		singleLine?: boolean;
		ghostText?: string;
		onAcceptGhostText?: () => void;
		renderItem?: Snippet<[{ item: MentionItem; highlighted: boolean }]>;
		children?: Snippet;
	}

	let {
		triggers,
		value,
		defaultValue,
		onChange,
		onSelect,
		onRemove,
		onQueryChange,
		onOpen,
		onClose,
		onError,
		placeholder,
		class: className,
		disabled,
		readOnly,
		autoFocus,
		singleLine,
		ghostText,
		onAcceptGhostText,
		renderItem,
		children,
	}: Props = $props();

	const api = useMentions({
		get triggers() { return triggers; },
		get value() { return value; },
		get defaultValue() { return defaultValue; },
		get onChange() { return onChange; },
		get onSelect() { return onSelect; },
		get onRemove() { return onRemove; },
		get onQueryChange() { return onQueryChange; },
		get onOpen() { return onOpen; },
		get onClose() { return onClose; },
		get onError() { return onError; },
		get ghostText() { return ghostText; },
		get onAcceptGhostText() { return onAcceptGhostText; },
	});

	const ctx: MentionsContext = {
		get state() { return api.state; },
		get aria() { return api.aria; },
		get editorRef() { return api.editorRef; },
		set editorRef(el) { api.editorRef = el; },
		get triggers() { return triggers; },
		get singleLine() { return singleLine; },
		handleInput: api.handleInput,
		handleKeyDown: api.handleKeyDown,
		handleBlur: api.handleBlur,
		handleCompositionStart: api.handleCompositionStart,
		handleCompositionEnd: api.handleCompositionEnd,
		handleScroll: api.handleScroll,
		buildHTML: api.buildHTML,
		performInsertion: api.performInsertion,
		clear: api.clear,
		focus: api.focus,
		insertTrigger: api.insertTrigger,
	};

	setMentionsContext(ctx);

	export function focus() { api.focus(); }
	export function clear() { api.clear(); }
	export function getValue() { return { markup: api.markup, plainText: api.plainText }; }
	export function insertTrigger(trigger: string) { api.insertTrigger(trigger); }
</script>

{#if children}
	<div data-mentions="" style="position: relative;">
		{@render children()}
	</div>
{:else}
	<div data-mentions="" style="position: relative;">
		<MentionsEditor {placeholder} class={className} {disabled} {readOnly} {autoFocus} {singleLine} />
		{#if api.isOpen || api.isLoading}
			<MentionsPortal>
				<MentionsList>
					{#if api.isLoading}
						<MentionsLoading>Loading...</MentionsLoading>
					{:else if api.items.length === 0}
						<MentionsEmpty>No results</MentionsEmpty>
					{:else}
						{#each api.items as item, i (item.id)}
							<MentionsItem index={i}>
								{#snippet children({ item: it, highlighted })}
									{#if renderItem}
										{@render renderItem({ item: it, highlighted })}
									{:else}
										{it.label}
									{/if}
								{/snippet}
							</MentionsItem>
						{/each}
					{/if}
				</MentionsList>
			</MentionsPortal>
		{/if}
	</div>
{/if}
