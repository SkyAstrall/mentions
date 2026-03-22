<script setup lang="ts">
import { ref, computed } from "vue";
import { Mentions, extractMentions } from "@skyastrall/mentions-vue";
import type { MentionItem, MentionsInstance, TriggerConfig } from "@skyastrall/mentions-vue";
import { users, tags, commands } from "../../data/mock";

type TriggerState = {
	enabled: boolean;
	char: string;
	label: string;
	color: string;
	data: MentionItem[];
};

const colorOptions = [
	"rgba(99,102,241,0.25)",
	"rgba(59,130,246,0.25)",
	"rgba(16,185,129,0.25)",
	"rgba(245,158,11,0.25)",
	"rgba(244,63,94,0.25)",
	"rgba(139,47,201,0.25)",
	"rgba(236,72,153,0.25)",
	"rgba(20,184,166,0.25)",
];

const mentionsRef = ref<MentionsInstance | null>(null);
const triggerStates = ref<TriggerState[]>([
	{ enabled: true, char: "@", label: "Users", color: colorOptions[0], data: users as MentionItem[] },
	{ enabled: true, char: "#", label: "Tags", color: colorOptions[2], data: tags as MentionItem[] },
	{ enabled: true, char: "/", label: "Commands", color: colorOptions[3], data: commands as MentionItem[] },
]);
const singleLine = ref(false);
const disabled = ref(false);
const readOnly = ref(false);
const asyncMode = ref(false);
const placeholder = ref("Type @ # or / to try it out...");
const debounceMs = ref(200);
const minChars = ref(0);
const maxSuggestions = ref(0);
const markup = ref("");
const plainText = ref("");
const copied = ref(false);
const events = ref<string[]>([]);
const customChar = ref("!");
const customLabel = ref("Emojis");
const customColor = ref(colorOptions[4]);
const customItems = ref("smile, wave, fire, check");

const asyncUsers = (query: string): Promise<MentionItem[]> =>
	new Promise((resolve) => {
		setTimeout(() => {
			const lower = query.toLowerCase();
			resolve((users as MentionItem[]).filter((u) => u.label.toLowerCase().includes(lower)));
		}, 300 + Math.random() * 400);
	});

function log(msg: string) {
	events.value = [`${new Date().toLocaleTimeString()} ${msg}`, ...events.value].slice(0, 50);
}

function updateTrigger(idx: number, updates: Partial<TriggerState>) {
	triggerStates.value = triggerStates.value.map((t, i) => (i === idx ? { ...t, ...updates } : t));
}

function addCustomTrigger() {
	if (!customChar.value.trim() || !customLabel.value.trim()) return;
	const items: MentionItem[] = customItems.value
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean)
		.map((label, i) => ({ id: `custom-${Date.now()}-${i}`, label }));
	if (items.length === 0) return;
	triggerStates.value = [
		...triggerStates.value,
		{ enabled: true, char: customChar.value, label: customLabel.value, color: customColor.value, data: items },
	];
	customChar.value = "!";
	customLabel.value = "";
	customItems.value = "";
}

function removeTrigger(idx: number) {
	if (triggerStates.value.length <= 1) return;
	triggerStates.value = triggerStates.value.filter((_, i) => i !== idx);
}

const triggers = computed<TriggerConfig[]>(() =>
	triggerStates.value
		.filter((t) => t.enabled)
		.map((t) => ({
			char: t.char,
			data: asyncMode.value && t.char === "@" ? asyncUsers : t.data,
			color: t.color,
			debounce: debounceMs.value,
			minChars: minChars.value,
			...(maxSuggestions.value > 0 ? { maxSuggestions: maxSuggestions.value } : {}),
		})),
);

const code = computed(() => {
	const trigLines = triggerStates.value
		.filter((t) => t.enabled)
		.map((t) => {
			const dataStr = asyncMode.value && t.char === "@" ? "fetchUsers" : t.label.toLowerCase();
			return `    { char: "${t.char}", data: ${dataStr}, color: "${t.color}" }`;
		});
	const props: string[] = [];
	props.push(`  :triggers="[\n${trigLines.join(",\n")}\n  ]"`);
	if (placeholder.value) props.push(`  placeholder="${placeholder.value}"`);
	if (singleLine.value) props.push("  single-line");
	props.push(`  v-model="markup"`);
	return `<script setup>\nimport { Mentions } from "@skyastrall/mentions-vue";\n<\/script>\n\n<template>\n  <Mentions\n${props.join("\n")}\n  />\n</template>`;
});

const mentionsList = computed(() => {
	try {
		return extractMentions(markup.value, triggers.value.map((t) => ({ ...t, data: [] })));
	} catch {
		return [];
	}
});

function handleCopy() {
	try { navigator.clipboard.writeText(code.value); } catch { /* fallback */ }
	copied.value = true;
	window.setTimeout(() => { copied.value = false; }, 2000);
}

function handleClearAction() {
	mentionsRef.value?.clear();
	markup.value = "";
	plainText.value = "";
}

function stressClearInsert() {
	mentionsRef.value?.clear();
	mentionsRef.value?.focus();
	window.setTimeout(() => mentionsRef.value?.insertTrigger("@"), 50);
}

function stressRapid5x() {
	for (let i = 0; i < 5; i++) {
		window.setTimeout(() => mentionsRef.value?.insertTrigger("@"), i * 80);
	}
}

function stressRapid10xMixed() {
	for (let i = 0; i < 10; i++) {
		const char = triggerStates.value[i % triggerStates.value.length].char;
		window.setTimeout(() => mentionsRef.value?.insertTrigger(char), i * 60);
	}
}
</script>

<template>
	<div class="pg">
		<div class="pg-main">
			<div class="pg-preview">
				<Mentions
					ref="mentionsRef"
					class-name="pg-editor"
					:triggers="triggers"
					:single-line="singleLine"
					:disabled="disabled"
					:read-only="readOnly"
					:placeholder="placeholder"
					@update:model-value="(m: string) => { markup = m; }"
					@select="(item: MentionItem, trigger: string) => log(`select ${trigger}${item.label}`)"
					@remove="(item: MentionItem, trigger: string) => log(`remove ${trigger}${item.label}`)"
					@open="(trigger: string) => log(`open ${trigger}`)"
					@close="log('close')"
					@error="(err: Error) => log(`error: ${err.message}`)"
				/>
			</div>

			<div class="pg-code">
				<div class="pg-code-header">
					<span>Generated Code</span>
					<button type="button" @click="handleCopy" class="pg-btn-sm">{{ copied ? "Copied!" : "Copy" }}</button>
				</div>
				<pre><code>{{ code }}</code></pre>
			</div>

			<div v-if="markup || plainText" class="pg-panel">
				<div class="pg-panel-header">Output</div>
				<div class="pg-panel-body">
					<div><span class="pg-label">Markup</span> <code>{{ markup }}</code></div>
					<div><span class="pg-label">Plain text</span> <code>{{ plainText }}</code></div>
					<div><span class="pg-label">Mentions</span> <code>{{ JSON.stringify(mentionsList) }}</code></div>
				</div>
			</div>

			<div v-if="events.length > 0" class="pg-panel">
				<div class="pg-panel-header">
					<span>Event Log ({{ events.length }})</span>
					<button type="button" @click="events = []" class="pg-btn-sm">Clear</button>
				</div>
				<div class="pg-events-list">
					<div v-for="(e, i) in events" :key="`${e}-${i}`" class="pg-event">{{ e }}</div>
				</div>
			</div>
		</div>

		<div class="pg-sidebar">
			<div class="pg-section">
				<h3>Triggers</h3>
				<div v-for="(t, idx) in triggerStates" :key="`${t.char}-${idx}`" class="pg-trigger-row">
					<label class="pg-toggle">
						<input type="checkbox" :checked="t.enabled" @change="updateTrigger(idx, { enabled: ($event.target as HTMLInputElement).checked })" />
						<span class="pg-trigger-char">{{ t.char }}</span>
						<span>{{ t.label }}</span>
					</label>
					<div class="pg-color-row">
						<button
							v-for="c in colorOptions"
							:key="c"
							type="button"
							:class="['pg-color-dot', t.color === c ? 'active' : '']"
							:style="{ background: c.replace(/[\d.]+\)$/, '1)') }"
							@click="updateTrigger(idx, { color: c })"
						/>
						<button v-if="triggerStates.length > 1" type="button" class="pg-btn-sm pg-btn-danger" @click="removeTrigger(idx)">Remove</button>
					</div>
				</div>
				<div class="pg-add-trigger-form">
					<div class="pg-add-trigger-row">
						<input type="text" v-model="customChar" class="pg-input-sm" :style="{ width: '36px', textAlign: 'center' }" maxlength="2" placeholder="!" />
						<input type="text" v-model="customLabel" class="pg-input-sm" :style="{ flex: 1 }" placeholder="Label (e.g. Emojis)" />
					</div>
					<input type="text" v-model="customItems" class="pg-input" placeholder="Items (comma separated: smile, wave, fire)" />
					<div class="pg-add-trigger-row">
						<div class="pg-color-row" :style="{ paddingLeft: 0 }">
							<button
								v-for="c in colorOptions"
								:key="`new-${c}`"
								type="button"
								:class="['pg-color-dot', customColor === c ? 'active' : '']"
								:style="{ background: c.replace(/[\d.]+\)$/, '1)') }"
								@click="customColor = c"
							/>
						</div>
						<button type="button" class="pg-btn-sm" @click="addCustomTrigger" :style="{ whiteSpace: 'nowrap' }">Add trigger</button>
					</div>
				</div>
			</div>

			<div class="pg-section">
				<h3>Editor</h3>
				<label class="pg-toggle"><input type="checkbox" v-model="singleLine" /><span>Single line</span></label>
				<label class="pg-toggle"><input type="checkbox" v-model="disabled" /><span>Disabled</span></label>
				<label class="pg-toggle"><input type="checkbox" v-model="readOnly" /><span>Read only</span></label>
				<label class="pg-toggle"><input type="checkbox" v-model="asyncMode" /><span>Async @ data</span></label>
				<div class="pg-field">
					<label>Placeholder</label>
					<input type="text" v-model="placeholder" class="pg-input" />
				</div>
			</div>

			<div class="pg-section">
				<h3>Trigger Options</h3>
				<div class="pg-field">
					<label>Debounce (ms)</label>
					<input type="number" v-model.number="debounceMs" class="pg-input" min="0" step="50" />
				</div>
				<div class="pg-field">
					<label>Min chars</label>
					<input type="number" v-model.number="minChars" class="pg-input" min="0" />
				</div>
				<div class="pg-field">
					<label>Max suggestions (0 = all)</label>
					<input type="number" v-model.number="maxSuggestions" class="pg-input" min="0" />
				</div>
			</div>

			<div class="pg-section">
				<h3>Actions</h3>
				<div class="pg-actions">
					<button type="button" @click="mentionsRef?.focus()">Focus</button>
					<button type="button" @click="handleClearAction">Clear</button>
					<button
						v-for="t in triggerStates.filter(t => t.enabled)"
						:key="t.char"
						type="button"
						@mousedown.prevent="mentionsRef?.insertTrigger(t.char)"
					>Insert {{ t.char }}</button>
				</div>
			</div>

			<div class="pg-section">
				<h3>Stress Tests</h3>
				<div class="pg-actions">
					<button type="button" @click="stressClearInsert">Clear + Insert</button>
					<button type="button" @click="stressRapid5x">Rapid 5x @</button>
					<button type="button" @click="stressRapid10xMixed">Rapid 10x mixed</button>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.pg { display: flex; gap: 24px; width: 100%; }
.pg-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 12px; }
.pg-sidebar { width: 280px; flex-shrink: 0; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; max-height: calc(100vh - 180px); position: sticky; top: 100px; }
.pg-preview { border-radius: 12px; }
:deep(.pg-editor) { width: 100%; min-height: 140px; padding: 16px; border: 1px solid var(--color-border); border-radius: 12px; font-family: 'Inter', system-ui, sans-serif; font-size: 15px; line-height: 1.6; box-sizing: border-box; color: var(--color-text); background: var(--color-bg-elevated); }
:deep(.pg-editor:focus) { border-color: #8B2FC9; box-shadow: 0 0 0 3px rgba(139,47,201,0.15); outline: none; }
:deep([data-mentions]) { --dropdown-bg: var(--color-bg-elevated); --dropdown-border: 1px solid var(--color-border); --dropdown-shadow: 0 8px 24px rgba(0,0,0,0.15); --item-active-bg: var(--color-accent-muted); --mention-placeholder: var(--color-text-dim); }
:deep([data-mentions-portal] ul) { color: var(--color-text); }
:deep([data-mentions-portal] li) { font-size: 14px; border-radius: 6px; margin: 2px 4px; }
.pg-code { background: var(--color-code-bg); border: 1px solid var(--color-code-border); border-radius: 12px; overflow: hidden; }
.pg-code-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-bottom: 1px solid var(--color-border); font-size: 12px; color: var(--color-text-muted); }
.pg-code pre { margin: 0; padding: 14px; overflow-x: auto; }
.pg-code code { font-family: var(--font-mono); font-size: 13px; line-height: 1.6; color: var(--color-code-text); }
.pg-panel { background: var(--color-bg-elevated); border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden; }
.pg-panel-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-bottom: 1px solid var(--color-border); font-size: 12px; font-weight: 500; color: var(--color-text-muted); }
.pg-panel-body { padding: 10px 12px; font-size: 12px; color: var(--color-text-muted); display: flex; flex-direction: column; gap: 6px; }
.pg-panel-body code { font-family: var(--font-mono); font-size: 11px; word-break: break-all; color: var(--color-text-secondary); }
.pg-label { font-weight: 500; color: var(--color-text-dim); margin-right: 6px; }
.pg-events-list { max-height: 120px; overflow-y: auto; }
.pg-event { padding: 3px 12px; font-family: var(--font-mono); font-size: 11px; color: var(--color-text-dim); border-bottom: 1px solid var(--color-border); }
.pg-event:first-child { color: var(--color-text-secondary); }
.pg-section { padding-bottom: 16px; border-bottom: 1px solid var(--color-border); }
.pg-section:last-child { border-bottom: none; }
.pg-section h3 { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-muted); margin: 0 0 10px; }
.pg-toggle { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--color-text-secondary); cursor: pointer; padding: 3px 0; }
.pg-toggle input { accent-color: #8B2FC9; }
.pg-toggle span { user-select: none; }
.pg-trigger-char { font-family: var(--font-mono); font-weight: 600; color: var(--color-text); min-width: 16px; }
.pg-trigger-row { margin-bottom: 8px; }
.pg-color-row { display: flex; align-items: center; gap: 4px; margin-top: 4px; padding-left: 24px; }
.pg-color-dot { width: 20px; height: 20px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transition: transform 150ms ease, box-shadow 150ms ease; outline: 2px solid transparent; outline-offset: 2px; }
.pg-color-dot.active { outline-color: var(--color-accent); transform: scale(1.15); }
.pg-color-dot:hover:not(.active) { transform: scale(1.1); box-shadow: 0 0 0 2px var(--color-border-hover); }
.pg-add-trigger-form { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--color-border); display: flex; flex-direction: column; gap: 8px; }
.pg-add-trigger-row { display: flex; gap: 6px; align-items: center; }
.pg-input-sm { padding: 4px 8px; font-size: 12px; border: 1px solid var(--color-border); border-radius: 6px; background: var(--color-bg-surface); color: var(--color-text); font-family: var(--font-mono); }
.pg-input-sm:focus { border-color: #8B2FC9; outline: none; }
.pg-field { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; }
.pg-field label { font-size: 12px; color: var(--color-text-dim); }
.pg-input { padding: 6px 10px; font-size: 13px; border: 1px solid var(--color-border); border-radius: 6px; background: var(--color-bg-surface); color: var(--color-text); }
.pg-input:focus { border-color: #8B2FC9; outline: none; }
.pg-actions { display: flex; flex-wrap: wrap; gap: 6px; }
.pg-actions button { padding: 6px 12px; border: 1px solid var(--color-border); border-radius: 6px; background: none; color: var(--color-text-muted); font-size: 12px; cursor: pointer; transition: color 150ms ease, border-color 150ms ease; }
.pg-actions button:hover { color: var(--color-text); border-color: var(--color-border-hover); }
.pg-btn-sm { background: none; border: 1px solid var(--color-border); color: var(--color-text-muted); font-size: 11px; padding: 3px 8px; border-radius: 4px; cursor: pointer; transition: color 150ms ease; }
.pg-btn-sm:hover { color: var(--color-text); }
.pg-btn-danger { color: #ef4444; border-color: rgba(239,68,68,0.2); }
.pg-btn-danger:hover { color: #f87171; border-color: rgba(239,68,68,0.4); }
@media (max-width: 768px) {
	.pg { flex-direction: column-reverse; }
	.pg-sidebar { width: 100%; max-height: none; position: static; flex-direction: row; flex-wrap: wrap; }
	.pg-section { flex: 1; min-width: 200px; }
}
</style>
