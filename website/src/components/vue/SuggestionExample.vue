<script setup lang="ts">
import { Mentions, MentionsEditor, MentionsPortal, MentionsList, MentionsSuggestions, useMentions, type TriggerConfig } from "@skyastrall/mentions-vue";
const props = defineProps<{ layer: string; triggers: TriggerConfig[] }>();
const api = useMentions({ get triggers() { return props.triggers; } });
const { editorRef, aria } = api;
</script>

<template>

<div v-if="layer === 'headless'" data-mentions="">
	<div ref="editorRef" v-bind="aria.inputProps" contenteditable="true" data-mentions-editor="" tabindex="0" @input="api.handleInput" @keydown="api.handleKeyDown" @blur="api.handleBlur" @compositionstart="api.handleCompositionStart" @compositionend="api.handleCompositionEnd" @paste="api.handlePaste" />
	<div v-if="aria.isOpen || aria.isLoading" v-bind="aria.listProps" @scroll="api.handleListScroll($event.currentTarget as HTMLElement)">
		<template v-if="aria.groups.length">
			<div v-for="(group, gi) in aria.groups" :key="group.id ?? 'ungrouped'" v-bind="aria.getGroupProps(gi)">
				<div v-if="group.id !== null" v-bind="aria.getGroupLabelProps(gi)">{{ group.label }}</div>
				<div v-for="(item, offset) in group.items" :key="item.id" v-bind="aria.getItemProps(group.startIndex + offset)" @pointerdown.prevent @click="api.performInsertion(item)">{{ item.label }}</div>
			</div>
		</template>
		<template v-else><div v-for="(item, index) in aria.items" :key="item.id" v-bind="aria.getItemProps(index)" @pointerdown.prevent @click="api.performInsertion(item)">{{ item.label }}</div></template>
		<div v-if="aria.isLoading || aria.isLoadingMore" role="status">Loading...</div>
	</div>
</div>
<Mentions v-else-if="layer === 'compound'" :triggers="triggers">
	<MentionsEditor /><MentionsPortal><MentionsList><MentionsSuggestions /></MentionsList></MentionsPortal>
</Mentions>
<Mentions v-else :triggers="triggers" />
</template>
