import { useRef, useState } from "react";
import { Mentions, extractMentions } from "@skyastrall/mentions-react";
import type { MentionItem, MentionsHandle } from "@skyastrall/mentions-react";

const users: MentionItem[] = [
	{ id: "1", label: "Alice Johnson" },
	{ id: "2", label: "Bob Smith" },
	{ id: "3", label: "Charlie Brown" },
	{ id: "4", label: "Diana Prince" },
	{ id: "5", label: "Eve Wilson" },
	{ id: "6", label: "Frank Castle" },
	{ id: "7", label: "Grace Hopper" },
	{ id: "8", label: "Henry Ford" },
];

const tags: MentionItem[] = [
	{ id: "t1", label: "urgent" },
	{ id: "t2", label: "bug" },
	{ id: "t3", label: "feature" },
	{ id: "t4", label: "docs" },
	{ id: "t5", label: "refactor" },
];

const commands: MentionItem[] = [
	{ id: "c1", label: "assign" },
	{ id: "c2", label: "close" },
	{ id: "c3", label: "label" },
	{ id: "c4", label: "milestone" },
];

type Preset = {
	name: string;
	userColor: string;
	tagColor: string;
	commandColor: string;
	dropdownBg: string;
	dropdownBorder: string;
	editorBg: string;
	editorBorder: string;
	textColor: string;
};

const presets: Preset[] = [
	{ name: "Dark", userColor: "oklch(0.75 0.15 250)", tagColor: "oklch(0.75 0.12 300)", commandColor: "oklch(0.80 0.12 80)", dropdownBg: "#18181b", dropdownBorder: "rgba(255,255,255,0.1)", editorBg: "rgba(255,255,255,0.03)", editorBorder: "rgba(255,255,255,0.1)", textColor: "#fafafa" },
	{ name: "Light", userColor: "oklch(0.90 0.08 240)", tagColor: "oklch(0.90 0.08 300)", commandColor: "oklch(0.92 0.08 80)", dropdownBg: "#ffffff", dropdownBorder: "#e2e8f0", editorBg: "#ffffff", editorBorder: "#e2e8f0", textColor: "#1a1a1a" },
	{ name: "Warm Dark", userColor: "#d4e9ff", tagColor: "#fde68a", commandColor: "#d9f99d", dropdownBg: "#1a1d21", dropdownBorder: "#383a3e", editorBg: "#222529", editorBorder: "#383a3e", textColor: "#d1d2d3" },
	{ name: "Cool Dark", userColor: "rgba(88,101,242,0.3)", tagColor: "rgba(87,242,135,0.3)", commandColor: "rgba(254,215,170,0.3)", dropdownBg: "#2b2d31", dropdownBorder: "#1e1f22", editorBg: "#383a40", editorBorder: "#1e1f22", textColor: "#dbdee1" },
];

function generateCode(config: { enableUsers: boolean; enableTags: boolean; enableCommands: boolean; singleLine: boolean; preset: Preset }): string {
	const triggers: string[] = [];
	if (config.enableUsers) triggers.push(`  { char: "@", data: users, color: "${config.preset.userColor}" }`);
	if (config.enableTags) triggers.push(`  { char: "#", data: tags, color: "${config.preset.tagColor}" }`);
	if (config.enableCommands) triggers.push(`  { char: "/", data: commands, color: "${config.preset.commandColor}" }`);

	const props: string[] = [];
	props.push(`  triggers={[\n${triggers.join(",\n")}\n  ]}`);
	if (config.singleLine) props.push("  singleLine");
	props.push("  onChange={(markup, plainText) => { /* handle change */ }}");

	return `import { Mentions } from "@skyastrall/mentions-react";\n\n<Mentions\n${props.join("\n")}\n/>`;
}

export default function Playground() {
	const ref = useRef<MentionsHandle>(null);
	const [preset, setPreset] = useState<Preset>(presets[0]);
	const [enableUsers, setEnableUsers] = useState(true);
	const [enableTags, setEnableTags] = useState(true);
	const [enableCommands, setEnableCommands] = useState(true);
	const [singleLine, setSingleLine] = useState(false);
	const [disabled, setDisabled] = useState(false);
	const [readOnly, setReadOnly] = useState(false);
	const [markup, setMarkup] = useState("");
	const [copied, setCopied] = useState(false);

	const triggers = [
		...(enableUsers ? [{ char: "@", data: users, color: preset.userColor }] : []),
		...(enableTags ? [{ char: "#", data: tags, color: preset.tagColor }] : []),
		...(enableCommands ? [{ char: "/", data: commands, color: preset.commandColor }] : []),
	];

	const code = generateCode({ enableUsers, enableTags, enableCommands, singleLine, preset });

	const handleCopy = () => {
		navigator.clipboard.writeText(code);
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
						placeholder="Type @ # or / to try it out..."
						onChange={(m) => setMarkup(m)}
					/>
				</div>

				<div className="pg-code">
					<div className="pg-code-header">
						<span>Generated Code</span>
						<button type="button" onClick={handleCopy} className="pg-copy">{copied ? "Copied" : "Copy"}</button>
					</div>
					<pre><code>{code}</code></pre>
				</div>

				{markup && (
					<div className="pg-debug">
						<div><strong>Markup:</strong> <code>{markup}</code></div>
						<div><strong>Mentions:</strong> <code>{JSON.stringify(extractMentions(markup, triggers.map(t => ({ ...t, data: [] }))))}</code></div>
					</div>
				)}
			</div>

			<div className="pg-sidebar">
				<div className="pg-section">
					<h3>Preset</h3>
					<div className="pg-presets">
						{presets.map((p) => (
							<button key={p.name} type="button" className={`pg-preset ${preset.name === p.name ? "active" : ""}`} onClick={() => setPreset(p)}>
								<span className="pg-preset-dot" style={{ background: p.userColor }} />
								{p.name}
							</button>
						))}
					</div>
				</div>

				<div className="pg-section">
					<h3>Triggers</h3>
					<label className="pg-toggle"><input type="checkbox" checked={enableUsers} onChange={(e) => setEnableUsers(e.target.checked)} /><span>@ Users</span></label>
					<label className="pg-toggle"><input type="checkbox" checked={enableTags} onChange={(e) => setEnableTags(e.target.checked)} /><span># Tags</span></label>
					<label className="pg-toggle"><input type="checkbox" checked={enableCommands} onChange={(e) => setEnableCommands(e.target.checked)} /><span>/ Commands</span></label>
				</div>

				<div className="pg-section">
					<h3>Options</h3>
					<label className="pg-toggle"><input type="checkbox" checked={singleLine} onChange={(e) => setSingleLine(e.target.checked)} /><span>Single line</span></label>
					<label className="pg-toggle"><input type="checkbox" checked={disabled} onChange={(e) => setDisabled(e.target.checked)} /><span>Disabled</span></label>
					<label className="pg-toggle"><input type="checkbox" checked={readOnly} onChange={(e) => setReadOnly(e.target.checked)} /><span>Read only</span></label>
				</div>

				<div className="pg-section">
					<h3>Actions</h3>
					<div className="pg-actions">
						<button type="button" onClick={() => ref.current?.focus()}>Focus</button>
						<button type="button" onClick={() => ref.current?.clear()}>Clear</button>
						<button type="button" onMouseDown={(e) => { e.preventDefault(); ref.current?.insertTrigger("@"); }}>Insert @</button>
					</div>
				</div>
			</div>

			<style>{`
				.pg { display: flex; gap: 24px; width: 100%; }
				.pg-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 16px; }
				.pg-sidebar { width: 240px; flex-shrink: 0; display: flex; flex-direction: column; gap: 20px; }
				.pg-preview { border-radius: 12px; }
				.pg-preview [data-mentions] {
					--dropdown-bg: ${preset.dropdownBg};
					--dropdown-border: 1px solid ${preset.dropdownBorder};
					--item-active-bg: rgba(99,102,241,0.2);
					--mention-placeholder: #71717a;
				}
				.pg-editor {
					width: 100%;
					min-height: ${singleLine ? "auto" : "160px"};
					padding: 16px;
					border: 1px solid ${preset.editorBorder};
					border-radius: 12px;
					font-family: 'Inter', system-ui, sans-serif;
					font-size: 15px;
					line-height: 1.6;
					box-sizing: border-box;
					color: ${preset.textColor};
					background: ${preset.editorBg};
				}
				.pg-editor:focus {
					border-color: #6366f1;
					box-shadow: 0 0 0 3px rgba(99,102,241,0.2);
				}
				.pg-preview [data-mentions-portal] ul { color: ${preset.textColor}; }
				.pg-preview [data-mentions-portal] li { font-size: 14px; border-radius: 6px; margin: 2px 4px; cursor: pointer; }
				.pg-code { background: #18181b; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; overflow: hidden; }
				.pg-code-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 12px; color: #a1a1aa; }
				.pg-copy { background: none; border: 1px solid rgba(255,255,255,0.1); color: #a1a1aa; font-size: 12px; padding: 4px 10px; border-radius: 6px; cursor: pointer; }
				.pg-copy:hover { color: #fafafa; border-color: rgba(255,255,255,0.2); }
				.pg-code pre { margin: 0; padding: 14px; overflow-x: auto; }
				.pg-code code { font-family: 'JetBrains Mono', monospace; font-size: 13px; line-height: 1.6; color: #e4e4e7; }
				.pg-debug { padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; font-size: 12px; color: #a1a1aa; display: flex; flex-direction: column; gap: 6px; }
				.pg-debug code { font-family: 'JetBrains Mono', monospace; font-size: 11px; word-break: break-all; }
				.pg-section h3 { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #71717a; margin: 0 0 10px; }
				.pg-presets { display: flex; flex-direction: column; gap: 4px; }
				.pg-preset { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 8px; border: 1px solid transparent; background: none; color: #a1a1aa; font-size: 13px; cursor: pointer; text-align: left; }
				.pg-preset:hover { background: rgba(255,255,255,0.03); color: #fafafa; }
				.pg-preset.active { border-color: rgba(99,102,241,0.3); background: rgba(99,102,241,0.08); color: #fafafa; }
				.pg-preset-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
				.pg-toggle { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #a1a1aa; cursor: pointer; padding: 4px 0; }
				.pg-toggle input { accent-color: #6366f1; }
				.pg-toggle span { user-select: none; }
				.pg-actions { display: flex; flex-wrap: wrap; gap: 6px; }
				.pg-actions button { padding: 6px 12px; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; background: none; color: #a1a1aa; font-size: 12px; cursor: pointer; }
				.pg-actions button:hover { color: #fafafa; border-color: rgba(255,255,255,0.2); }
				@media (max-width: 768px) {
					.pg { flex-direction: column-reverse; }
					.pg-sidebar { width: 100%; flex-direction: row; flex-wrap: wrap; }
					.pg-section { flex: 1; min-width: 200px; }
				}
			`}</style>
		</div>
	);
}
