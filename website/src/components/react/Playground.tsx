import { useRef, useState, useCallback } from "react";
import { Mentions, extractMentions } from "@skyastrall/mentions-react";
import type { MentionItem, MentionsHandle } from "@skyastrall/mentions-react";
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

const defaultTriggers: TriggerState[] = [
	{ enabled: true, char: "@", label: "Users", color: colorOptions[0], data: users },
	{ enabled: true, char: "#", label: "Tags", color: colorOptions[2], data: tags },
	{ enabled: true, char: "/", label: "Commands", color: colorOptions[3], data: commands },
];

const asyncUsers: (query: string) => Promise<MentionItem[]> = (query) =>
	new Promise((resolve) => {
		setTimeout(() => {
			const lower = query.toLowerCase();
			resolve(users.filter((u) => u.label.toLowerCase().includes(lower)));
		}, 300 + Math.random() * 400);
	});

function generateCode(triggerStates: TriggerState[], opts: { singleLine: boolean; asyncMode: boolean; placeholder: string }): string {
	const trigLines = triggerStates
		.filter((t) => t.enabled)
		.map((t) => {
			const dataStr = opts.asyncMode && t.char === "@" ? "fetchUsers" : t.label.toLowerCase();
			return `    { char: "${t.char}", data: ${dataStr}, color: "${t.color}" }`;
		});

	const props: string[] = [];
	props.push(`  triggers={[\n${trigLines.join(",\n")}\n  ]}`);
	if (opts.placeholder) props.push(`  placeholder="${opts.placeholder}"`);
	if (opts.singleLine) props.push("  singleLine");
	props.push(`  onChange={(markup, plainText) => { /* handle */ }}`);

	return `import { Mentions } from "@skyastrall/mentions-react";\n\n<Mentions\n${props.join("\n")}\n/>`;
}

export default function Playground() {
	const ref = useRef<MentionsHandle>(null);
	const [triggerStates, setTriggerStates] = useState<TriggerState[]>(defaultTriggers);
	const [singleLine, setSingleLine] = useState(false);
	const [disabled, setDisabled] = useState(false);
	const [readOnly, setReadOnly] = useState(false);
	const [asyncMode, setAsyncMode] = useState(false);
	const [placeholder, setPlaceholder] = useState("Type @ # or / to try it out...");
	const [debounceMs, setDebounceMs] = useState(200);
	const [minChars, setMinChars] = useState(0);
	const [maxSuggestions, setMaxSuggestions] = useState(0);
	const [markup, setMarkup] = useState("");
	const [plainText, setPlainText] = useState("");
	const [copied, setCopied] = useState(false);
	const [events, setEvents] = useState<string[]>([]);
	const [customChar, setCustomChar] = useState("!");
	const [customLabel, setCustomLabel] = useState("Emojis");
	const [customColor, setCustomColor] = useState(colorOptions[4]);
	const [customItems, setCustomItems] = useState("smile, wave, fire, check");

	const log = useCallback((msg: string) => {
		setEvents((prev) => [`${new Date().toLocaleTimeString()} ${msg}`, ...prev].slice(0, 50));
	}, []);

	const updateTrigger = (idx: number, updates: Partial<TriggerState>) => {
		setTriggerStates((prev) => prev.map((t, i) => i === idx ? { ...t, ...updates } : t));
	};

	const addCustomTrigger = () => {
		if (!customChar.trim() || !customLabel.trim()) return;
		const items: MentionItem[] = customItems
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean)
			.map((label, i) => ({ id: `custom-${Date.now()}-${i}`, label }));
		if (items.length === 0) return;
		setTriggerStates((prev) => [...prev, { enabled: true, char: customChar, label: customLabel, color: customColor, data: items }]);
		setCustomChar("!");
		setCustomLabel("");
		setCustomItems("");
	};

	const removeTrigger = (idx: number) => {
		if (triggerStates.length <= 1) return;
		setTriggerStates((prev) => prev.filter((_, i) => i !== idx));
	};

	const triggers = triggerStates
		.filter((t) => t.enabled)
		.map((t) => ({
			char: t.char,
			data: asyncMode && t.char === "@" ? asyncUsers : t.data,
			color: t.color,
			debounce: debounceMs,
			minChars,
			...(maxSuggestions > 0 ? { maxSuggestions } : {}),
		}));

	const code = generateCode(triggerStates, { singleLine, asyncMode, placeholder });

	const handleCopy = () => {
		try { navigator.clipboard.writeText(code); } catch { /* fallback */ }
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div className="pg">
			<div className="pg-main">
				<div className="pg-preview">
					<Mentions
						ref={ref}
						className="pg-editor"
						triggers={triggers}
						singleLine={singleLine}
						disabled={disabled}
						readOnly={readOnly}
						placeholder={placeholder}
						onChange={(m, p) => { setMarkup(m); setPlainText(p); }}
						onSelect={(item, trigger) => log(`select ${trigger}${item.label}`)}
						onRemove={(item, trigger) => log(`remove ${trigger}${item.label}`)}
						onOpen={(trigger) => log(`open ${trigger}`)}
						onClose={() => log("close")}
						onError={(err) => log(`error: ${err.message}`)}
					/>
				</div>

				<div className="pg-code">
					<div className="pg-code-header">
						<span>Generated Code</span>
						<button type="button" onClick={handleCopy} className="pg-btn-sm">{copied ? "Copied!" : "Copy"}</button>
					</div>
					<pre><code>{code}</code></pre>
				</div>

				{(markup || plainText) && (
					<div className="pg-panel">
						<div className="pg-panel-header">Output</div>
						<div className="pg-panel-body">
							<div><span className="pg-label">Markup</span> <code>{markup}</code></div>
							<div><span className="pg-label">Plain text</span> <code>{plainText}</code></div>
							<div><span className="pg-label">Mentions</span> <code>{JSON.stringify(extractMentions(markup, triggers.map(t => ({ ...t, data: [] }))))}</code></div>
						</div>
					</div>
				)}

				{events.length > 0 && (
					<div className="pg-panel">
						<div className="pg-panel-header">
							<span>Event Log ({events.length})</span>
							<button type="button" onClick={() => setEvents([])} className="pg-btn-sm">Clear</button>
						</div>
						<div className="pg-events-list">
							{events.map((e, i) => <div key={`${e}-${i}`} className="pg-event">{e}</div>)}
						</div>
					</div>
				)}
			</div>

			<div className="pg-sidebar">
				<div className="pg-section">
					<h3>Triggers</h3>
					{triggerStates.map((t, idx) => (
						<div key={`${t.char}-${idx}`} className="pg-trigger-row">
							<label className="pg-toggle">
								<input type="checkbox" checked={t.enabled} onChange={(e) => updateTrigger(idx, { enabled: e.target.checked })} />
								<span className="pg-trigger-char">{t.char}</span>
								<span>{t.label}</span>
							</label>
							<div className="pg-color-row">
								{colorOptions.map((c) => (
									<button
										key={c}
										type="button"
										className={`pg-color-dot ${t.color === c ? "active" : ""}`}
										style={{ background: c.replace(/[\d.]+\)$/, "1)") }}
										onClick={() => updateTrigger(idx, { color: c })}
										aria-label={`Set color for ${t.char}`}
									/>
								))}
								{triggerStates.length > 1 && (
									<button type="button" className="pg-btn-sm pg-btn-danger" onClick={() => removeTrigger(idx)}>Remove</button>
								)}
							</div>
						</div>
					))}
					<div className="pg-add-trigger-form">
						<div className="pg-add-trigger-row">
							<input type="text" value={customChar} onChange={(e) => setCustomChar(e.target.value)} className="pg-input-sm" style={{ width: 36, textAlign: "center" }} maxLength={2} placeholder="!" />
							<input type="text" value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} className="pg-input-sm" style={{ flex: 1 }} placeholder="Label (e.g. Emojis)" />
						</div>
						<input type="text" value={customItems} onChange={(e) => setCustomItems(e.target.value)} className="pg-input" placeholder="Items (comma separated: smile, wave, fire)" />
						<div className="pg-add-trigger-row">
							<div className="pg-color-row" style={{ paddingLeft: 0 }}>
								{colorOptions.map((c) => (
									<button
										key={`new-${c}`}
										type="button"
										className={`pg-color-dot ${customColor === c ? "active" : ""}`}
										style={{ background: c.replace(/[\d.]+\)$/, "1)") }}
										onClick={() => setCustomColor(c)}
										aria-label="Select color"
									/>
								))}
							</div>
							<button type="button" className="pg-btn-sm" onClick={addCustomTrigger} style={{ whiteSpace: "nowrap" }}>Add trigger</button>
						</div>
					</div>
				</div>

				<div className="pg-section">
					<h3>Editor</h3>
					<label className="pg-toggle"><input type="checkbox" checked={singleLine} onChange={(e) => setSingleLine(e.target.checked)} /><span>Single line</span></label>
					<label className="pg-toggle"><input type="checkbox" checked={disabled} onChange={(e) => setDisabled(e.target.checked)} /><span>Disabled</span></label>
					<label className="pg-toggle"><input type="checkbox" checked={readOnly} onChange={(e) => setReadOnly(e.target.checked)} /><span>Read only</span></label>
					<label className="pg-toggle"><input type="checkbox" checked={asyncMode} onChange={(e) => setAsyncMode(e.target.checked)} /><span>Async @ data</span></label>
					<div className="pg-field">
						<label>Placeholder</label>
						<input type="text" value={placeholder} onChange={(e) => setPlaceholder(e.target.value)} className="pg-input" />
					</div>
				</div>

				<div className="pg-section">
					<h3>Trigger Options</h3>
					<div className="pg-field">
						<label>Debounce (ms)</label>
						<input type="number" value={debounceMs} onChange={(e) => setDebounceMs(Number(e.target.value))} className="pg-input" min={0} step={50} />
					</div>
					<div className="pg-field">
						<label>Min chars</label>
						<input type="number" value={minChars} onChange={(e) => setMinChars(Number(e.target.value))} className="pg-input" min={0} />
					</div>
					<div className="pg-field">
						<label>Max suggestions (0 = all)</label>
						<input type="number" value={maxSuggestions} onChange={(e) => setMaxSuggestions(Number(e.target.value))} className="pg-input" min={0} />
					</div>
				</div>

				<div className="pg-section">
					<h3>Actions</h3>
					<div className="pg-actions">
						<button type="button" onClick={() => ref.current?.focus()}>Focus</button>
						<button type="button" onClick={() => { ref.current?.clear(); setMarkup(""); setPlainText(""); }}>Clear</button>
						{triggerStates.filter(t => t.enabled).map((t) => (
							<button key={t.char} type="button" onMouseDown={(e) => { e.preventDefault(); ref.current?.insertTrigger(t.char); }}>Insert {t.char}</button>
						))}
					</div>
				</div>

				<div className="pg-section">
					<h3>Stress Tests</h3>
					<div className="pg-actions">
						<button type="button" onClick={() => { ref.current?.clear(); ref.current?.focus(); setTimeout(() => ref.current?.insertTrigger("@"), 50); }}>Clear + Insert</button>
						<button type="button" onClick={() => { for (let i = 0; i < 5; i++) setTimeout(() => ref.current?.insertTrigger("@"), i * 80); }}>Rapid 5x @</button>
						<button type="button" onClick={() => { for (let i = 0; i < 10; i++) setTimeout(() => ref.current?.insertTrigger(triggerStates[i % triggerStates.length].char), i * 60); }}>Rapid 10x mixed</button>
					</div>
				</div>
			</div>

			<style>{`
				.pg { display: flex; gap: 24px; width: 100%; }
				.pg-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 12px; }
				.pg-sidebar { width: 280px; flex-shrink: 0; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; max-height: calc(100vh - 180px); position: sticky; top: 100px; }
				.pg-preview { border-radius: 12px; }
				.pg-editor {
					width: 100%;
					min-height: ${singleLine ? "auto" : "140px"};
					padding: 16px;
					border: 1px solid var(--color-border);
					border-radius: 12px;
					font-family: 'Inter', system-ui, sans-serif;
					font-size: 15px;
					line-height: 1.6;
					box-sizing: border-box;
					color: var(--color-text);
					background: var(--color-bg-elevated);
				}
				.pg-editor:focus { border-color: #8B2FC9; box-shadow: 0 0 0 3px rgba(139,47,201,0.15); outline: none; }
				.pg-preview [data-mentions] {
					--dropdown-bg: var(--color-bg-elevated);
					--dropdown-border: 1px solid var(--color-border);
					--dropdown-shadow: 0 8px 24px rgba(0,0,0,0.15);
					--item-active-bg: var(--color-accent-muted);
					--mention-placeholder: var(--color-text-dim);
				}
				.pg-preview [data-mentions-portal] ul { color: var(--color-text); }
				.pg-preview [data-mentions-portal] li { font-size: 14px; border-radius: 6px; margin: 2px 4px; }
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
			`}</style>
		</div>
	);
}
