<script lang="ts">
	import { Mentions, extractMentions } from "@skyastrall/mentions-svelte";
	import type { MentionItem, TriggerConfig } from "@skyastrall/mentions-svelte";
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

	let mentionsApi: ReturnType<typeof import("@skyastrall/mentions-svelte").useMentions> | null = $state(null);
	let triggerStates: TriggerState[] = $state([
		{ enabled: true, char: "@", label: "Users", color: colorOptions[0], data: users as MentionItem[] },
		{ enabled: true, char: "#", label: "Tags", color: colorOptions[2], data: tags as MentionItem[] },
		{ enabled: true, char: "/", label: "Commands", color: colorOptions[3], data: commands as MentionItem[] },
	]);
	let singleLine = $state(false);
	let isDisabled = $state(false);
	let isReadOnly = $state(false);
	let asyncMode = $state(false);
	let placeholder = $state("Type @ # or / to try it out...");
	let debounceMs = $state(200);
	let minChars = $state(0);
	let maxSuggestions = $state(0);
	let markup = $state("");
	let plainText = $state("");
	let copied = $state(false);
	let events: string[] = $state([]);
	let customChar = $state("!");
	let customLabel = $state("Emojis");
	let customColor = $state(colorOptions[4]);
	let customItems = $state("smile, wave, fire, check");

	const asyncUsers = (query: string): Promise<MentionItem[]> =>
		new Promise((resolve) => {
			setTimeout(() => {
				const lower = query.toLowerCase();
				resolve((users as MentionItem[]).filter((u) => u.label.toLowerCase().includes(lower)));
			}, 300 + Math.random() * 400);
		});

	function log(msg: string) {
		events = [`${new Date().toLocaleTimeString()} ${msg}`, ...events].slice(0, 50);
	}

	function updateTrigger(idx: number, updates: Partial<TriggerState>) {
		triggerStates = triggerStates.map((t, i) => (i === idx ? { ...t, ...updates } : t));
	}

	function addCustomTrigger() {
		if (!customChar.trim() || !customLabel.trim()) return;
		const items: MentionItem[] = customItems
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean)
			.map((label, i) => ({ id: `custom-${Date.now()}-${i}`, label }));
		if (items.length === 0) return;
		triggerStates = [
			...triggerStates,
			{ enabled: true, char: customChar, label: customLabel, color: customColor, data: items },
		];
		customChar = "!";
		customLabel = "";
		customItems = "";
	}

	function removeTrigger(idx: number) {
		if (triggerStates.length <= 1) return;
		triggerStates = triggerStates.filter((_, i) => i !== idx);
	}

	const triggers: TriggerConfig[] = $derived(
		triggerStates
			.filter((t) => t.enabled)
			.map((t) => ({
				char: t.char,
				data: asyncMode && t.char === "@" ? asyncUsers : t.data,
				color: t.color,
				debounce: debounceMs,
				minChars: minChars,
				...(maxSuggestions > 0 ? { maxSuggestions } : {}),
			})),
	);

	const mentionsList = $derived.by(() => {
		try {
			return extractMentions(markup, triggers.map((t) => ({ ...t, data: [] })));
		} catch {
			return [];
		}
	});

	const code = $derived.by(() => {
		const trigLines = triggerStates
			.filter((t) => t.enabled)
			.map((t) => {
				const dataStr = asyncMode && t.char === "@" ? "fetchUsers" : t.label.toLowerCase();
				return `    { char: "${t.char}", data: ${dataStr}, color: "${t.color}" }`;
			});
		const props: string[] = [];
		props.push(`  triggers={[\n${trigLines.join(",\n")}\n  ]}`);
		if (placeholder) props.push(`  placeholder="${placeholder}"`);
		if (singleLine) props.push("  singleLine");
		props.push(`  onChange={(m) => markup = m}`);
		return `<script>\nimport { Mentions } from "@skyastrall/mentions-svelte";\n<\/script>\n\n<Mentions\n${props.join("\n")}\n/>`;
	});

	function handleCopy() {
		try { navigator.clipboard.writeText(code); } catch { /* fallback */ }
		copied = true;
		setTimeout(() => { copied = false; }, 2000);
	}

	function handleClearAction() {
		mentionsApi?.clear();
		markup = "";
		plainText = "";
	}

	function stressClearInsert() {
		mentionsApi?.clear();
		mentionsApi?.focus();
		setTimeout(() => mentionsApi?.insertTrigger("@"), 50);
	}

	function stressRapid5x() {
		for (let i = 0; i < 5; i++) {
			setTimeout(() => mentionsApi?.insertTrigger("@"), i * 80);
		}
	}

	function stressRapid10xMixed() {
		for (let i = 0; i < 10; i++) {
			const char = triggerStates[i % triggerStates.length].char;
			setTimeout(() => mentionsApi?.insertTrigger(char), i * 60);
		}
	}
</script>

<div class="pg">
	<div class="pg-main">
		<div class="pg-preview">
			<Mentions
				class="pg-editor"
				{triggers}
				{singleLine}
				disabled={isDisabled}
				readOnly={isReadOnly}
				{placeholder}
				onChange={(m, p) => { markup = m; plainText = p; }}
				onSelect={(item, trigger) => log(`select ${trigger}${item.label}`)}
				onRemove={(item, trigger) => log(`remove ${trigger}${item.label}`)}
				onOpen={(trigger) => log(`open ${trigger}`)}
				onClose={() => log("close")}
				onError={(err) => log(`error: ${err.message}`)}
			/>
		</div>

		<div class="pg-code">
			<div class="pg-code-header">
				<span>Generated Code</span>
				<button type="button" onclick={handleCopy} class="pg-btn-sm">{copied ? "Copied!" : "Copy"}</button>
			</div>
			<pre><code>{code}</code></pre>
		</div>

		{#if markup || plainText}
			<div class="pg-panel">
				<div class="pg-panel-header">Output</div>
				<div class="pg-panel-body">
					<div><span class="pg-label">Markup</span> <code>{markup}</code></div>
					<div><span class="pg-label">Plain text</span> <code>{plainText}</code></div>
					<div><span class="pg-label">Mentions</span> <code>{JSON.stringify(mentionsList)}</code></div>
				</div>
			</div>
		{/if}

		{#if events.length > 0}
			<div class="pg-panel">
				<div class="pg-panel-header">
					<span>Event Log ({events.length})</span>
					<button type="button" onclick={() => events = []} class="pg-btn-sm">Clear</button>
				</div>
				<div class="pg-events-list">
					{#each events as e, i (`${e}-${i}`)}
						<div class="pg-event">{e}</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<div class="pg-sidebar">
		<div class="pg-section">
			<h3>Triggers</h3>
			{#each triggerStates as t, idx (`${t.char}-${idx}`)}
				<div class="pg-trigger-row">
					<label class="pg-toggle">
						<input type="checkbox" checked={t.enabled} onchange={(e) => updateTrigger(idx, { enabled: e.currentTarget.checked })} />
						<span class="pg-trigger-char">{t.char}</span>
						<span>{t.label}</span>
					</label>
					<div class="pg-color-row">
						{#each colorOptions as c (c)}
							<button
								type="button"
								class="pg-color-dot {t.color === c ? 'active' : ''}"
								style:background={c.replace(/[\d.]+\)$/, "1)")}
								onclick={() => updateTrigger(idx, { color: c })}
							></button>
						{/each}
						{#if triggerStates.length > 1}
							<button type="button" class="pg-btn-sm pg-btn-danger" onclick={() => removeTrigger(idx)}>Remove</button>
						{/if}
					</div>
				</div>
			{/each}
			<div class="pg-add-trigger-form">
				<div class="pg-add-trigger-row">
					<input type="text" bind:value={customChar} class="pg-input-sm" style:width="36px" style:text-align="center" maxlength="2" placeholder="!" />
					<input type="text" bind:value={customLabel} class="pg-input-sm" style:flex="1" placeholder="Label (e.g. Emojis)" />
				</div>
				<input type="text" bind:value={customItems} class="pg-input" placeholder="Items (comma separated: smile, wave, fire)" />
				<div class="pg-add-trigger-row">
					<div class="pg-color-row" style:padding-left="0">
						{#each colorOptions as c (`new-${c}`)}
							<button
								type="button"
								class="pg-color-dot {customColor === c ? 'active' : ''}"
								style:background={c.replace(/[\d.]+\)$/, "1)")}
								onclick={() => customColor = c}
							></button>
						{/each}
					</div>
					<button type="button" class="pg-btn-sm" onclick={addCustomTrigger} style:white-space="nowrap">Add trigger</button>
				</div>
			</div>
		</div>

		<div class="pg-section">
			<h3>Editor</h3>
			<label class="pg-toggle"><input type="checkbox" bind:checked={singleLine} /><span>Single line</span></label>
			<label class="pg-toggle"><input type="checkbox" bind:checked={isDisabled} /><span>Disabled</span></label>
			<label class="pg-toggle"><input type="checkbox" bind:checked={isReadOnly} /><span>Read only</span></label>
			<label class="pg-toggle"><input type="checkbox" bind:checked={asyncMode} /><span>Async @ data</span></label>
			<div class="pg-field">
				<label>Placeholder</label>
				<input type="text" bind:value={placeholder} class="pg-input" />
			</div>
		</div>

		<div class="pg-section">
			<h3>Trigger Options</h3>
			<div class="pg-field">
				<label>Debounce (ms)</label>
				<input type="number" bind:value={debounceMs} class="pg-input" min="0" step="50" />
			</div>
			<div class="pg-field">
				<label>Min chars</label>
				<input type="number" bind:value={minChars} class="pg-input" min="0" />
			</div>
			<div class="pg-field">
				<label>Max suggestions (0 = all)</label>
				<input type="number" bind:value={maxSuggestions} class="pg-input" min="0" />
			</div>
		</div>

		<div class="pg-section">
			<h3>Actions</h3>
			<div class="pg-actions">
				<button type="button" onclick={() => mentionsApi?.focus()}>Focus</button>
				<button type="button" onclick={handleClearAction}>Clear</button>
				{#each triggerStates.filter(t => t.enabled) as t (t.char)}
					<button type="button" onmousedown={(e) => { e.preventDefault(); mentionsApi?.insertTrigger(t.char); }}>Insert {t.char}</button>
				{/each}
			</div>
		</div>

		<div class="pg-section">
			<h3>Stress Tests</h3>
			<div class="pg-actions">
				<button type="button" onclick={stressClearInsert}>Clear + Insert</button>
				<button type="button" onclick={stressRapid5x}>Rapid 5x @</button>
				<button type="button" onclick={stressRapid10xMixed}>Rapid 10x mixed</button>
			</div>
		</div>
	</div>
</div>

<style>
.pg { display: flex; gap: 24px; width: 100%; }
.pg-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 12px; }
.pg-sidebar { width: 280px; flex-shrink: 0; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; max-height: calc(100vh - 180px); position: sticky; top: 100px; }
.pg-preview { border-radius: 12px; }
:global(#playground-svelte .pg-editor) { width: 100%; min-height: 140px; padding: 16px; border: 1px solid var(--color-border); border-radius: 12px; font-family: 'Inter', system-ui, sans-serif; font-size: 15px; line-height: 1.6; box-sizing: border-box; color: var(--color-text); background: var(--color-bg-elevated); }
:global(#playground-svelte .pg-editor:focus) { border-color: #FF3E00; box-shadow: 0 0 0 3px rgba(255,62,0,0.15); outline: none; }
:global(#playground-svelte [data-mentions]) { --dropdown-bg: var(--color-bg-elevated); --dropdown-border: 1px solid var(--color-border); --dropdown-shadow: 0 8px 24px rgba(0,0,0,0.15); --item-active-bg: var(--color-accent-muted); --mention-placeholder: var(--color-text-dim); }
:global(#playground-svelte [data-mentions-portal] ul) { color: var(--color-text); }
:global(#playground-svelte [data-mentions-portal] li) { font-size: 14px; border-radius: 6px; margin: 2px 4px; }
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
.pg-toggle input { accent-color: #FF3E00; }
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
.pg-input-sm:focus { border-color: #FF3E00; outline: none; }
.pg-field { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; }
.pg-field label { font-size: 12px; color: var(--color-text-dim); }
.pg-input { padding: 6px 10px; font-size: 13px; border: 1px solid var(--color-border); border-radius: 6px; background: var(--color-bg-surface); color: var(--color-text); }
.pg-input:focus { border-color: #FF3E00; outline: none; }
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
