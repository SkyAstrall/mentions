import type { MentionItem, MentionsHandle, TriggerConfig } from "@skyastrall/mentions-react";
import { extractMentions, Mentions, useMentions } from "@skyastrall/mentions-react";
import { useRef, useState } from "react";
import "@skyastrall/mentions-react/effects.css";

const users: MentionItem[] = [
	{ id: "1", label: "Alice Johnson", avatar: "AJ" },
	{ id: "2", label: "Bob Smith", avatar: "BS" },
	{ id: "3", label: "Charlie Brown", avatar: "CB" },
	{ id: "4", label: "Diana Prince", avatar: "DP" },
	{ id: "5", label: "Eve Wilson", avatar: "EW" },
	{ id: "6", label: "Frank Castle", avatar: "FC" },
	{ id: "7", label: "Grace Hopper", avatar: "GH" },
	{ id: "8", label: "Henry Ford", avatar: "HF" },
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

function DropInDemo() {
	const [markup, setMarkup] = useState("");
	const [plainText, setPlainText] = useState("");

	return (
		<section>
			<h2>Drop-in with per-trigger colors</h2>
			<p className="desc">
				Each trigger gets its own highlight color. <code>@users</code> = blue, <code>#tags</code> =
				purple, <code>/commands</code> = amber.
			</p>
			<Mentions
				triggers={[
					{ char: "@", data: users, color: "oklch(0.90 0.08 240)" },
					{ char: "#", data: tags, color: "oklch(0.90 0.08 300)" },
					{ char: "/", data: commands, color: "oklch(0.92 0.08 80)" },
				]}
				placeholder="Type @ # or / to see different highlight colors..."
				onChange={(m, p) => {
					setMarkup(m);
					setPlainText(p);
				}}
			/>
			<div className="debug">
				<div>
					<strong>Markup:</strong>
					<pre>{markup || "(empty)"}</pre>
				</div>
				<div>
					<strong>Plain text:</strong>
					<pre>{plainText || "(empty)"}</pre>
				</div>
				<div>
					<strong>Mentions:</strong>
					<pre>
						{JSON.stringify(
							extractMentions(markup, [
								{ char: "@", data: [] },
								{ char: "#", data: [] },
								{ char: "/", data: [] },
							]),
							null,
							2,
						)}
					</pre>
				</div>
			</div>
		</section>
	);
}

function FormattingDemo() {
	return (
		<section>
			<h2>WhatsApp-style formatting</h2>
			<p className="desc">
				Type <code>*bold*</code>, <code>_italic_</code>, or <code>~strikethrough~</code> — the
				overlay renders them visually. Combine with mentions.
			</p>
			<Mentions
				triggers={[{ char: "@", data: users, color: "oklch(0.90 0.08 240)" }]}
				placeholder="Try: *hello* _world_ ~deleted~ @someone..."
			/>
		</section>
	);
}

function CustomRenderDemo() {
	return (
		<section>
			<h2>Custom item rendering</h2>
			<p className="desc">
				Avatars for users, colored dots for tags via <code>renderItem</code>.
			</p>
			<Mentions
				triggers={[
					{ char: "@", data: users, maxSuggestions: 5, color: "oklch(0.90 0.08 240)" },
					{ char: "#", data: tags, color: "oklch(0.90 0.08 300)" },
				]}
				placeholder="Type @ for avatars, # for colored tags..."
				renderItem={(item, highlighted) => (
					<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
						{item.avatar && (
							<span
								style={{
									width: 28,
									height: 28,
									borderRadius: "50%",
									background: highlighted ? "#3b82f6" : "#e2e8f0",
									color: highlighted ? "white" : "#475569",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									fontSize: 11,
									fontWeight: 600,
								}}
							>
								{item.avatar as string}
							</span>
						)}
						<span style={{ fontWeight: highlighted ? 600 : 400 }}>{item.label}</span>
					</div>
				)}
			/>
		</section>
	);
}

function MinCharsDemo() {
	return (
		<section>
			<h2>minChars & maxSuggestions</h2>
			<p className="desc">
				<code>minChars: 2</code> — won't trigger until 2 chars after <code>@</code>.
				<code>maxSuggestions: 3</code> — caps the list.
			</p>
			<Mentions
				triggers={[{ char: "@", data: users, minChars: 2, maxSuggestions: 3 }]}
				placeholder="Type @al (won't trigger on just @)..."
			/>
		</section>
	);
}

function OnRemoveDemo() {
	const [log, setLog] = useState<string[]>([]);

	return (
		<section>
			<h2>onRemove callback</h2>
			<p className="desc">
				Add a mention then delete it — <code>onRemove</code> fires. Check the log below.
			</p>
			<Mentions
				triggers={[{ char: "@", data: users, color: "oklch(0.90 0.08 240)" }]}
				placeholder="Add @someone then backspace to remove..."
				onSelect={(item, trigger) => setLog((prev) => [...prev, `+ added ${trigger}${item.label}`])}
				onRemove={(item, trigger) =>
					setLog((prev) => [...prev, `- removed ${trigger}${item.label}`])
				}
			/>
			<div className="debug">
				<strong>Event log:</strong>
				<pre>{log.length > 0 ? log.join("\n") : "(no events yet)"}</pre>
			</div>
		</section>
	);
}

function ToolbarDemo() {
	const ref = useRef<MentionsHandle>(null);

	return (
		<section>
			<h2>Toolbar buttons</h2>
			<p className="desc">
				Buttons call <code>insertTrigger()</code> — inserts the trigger char at cursor and opens the
				dropdown. No custom code needed.
			</p>
			<Mentions
				ref={ref}
				triggers={[
					{ char: "@", data: users, color: "oklch(0.90 0.08 240)" },
					{ char: "#", data: tags, color: "oklch(0.90 0.08 300)" },
					{ char: "/", data: commands, color: "oklch(0.92 0.08 80)" },
				]}
				placeholder="Click a toolbar button or type directly..."
			/>
			<div className="toolbar" style={{ display: "flex", gap: 6, marginTop: 8 }}>
				<button
					type="button"
					onMouseDown={(e) => {
						e.preventDefault();
						ref.current?.insertTrigger("@");
					}}
				>
					<span style={{ fontWeight: 700 }}>@</span> Mention
				</button>
				<button
					type="button"
					onMouseDown={(e) => {
						e.preventDefault();
						ref.current?.insertTrigger("#");
					}}
				>
					<span style={{ fontWeight: 700 }}>#</span> Tag
				</button>
				<button
					type="button"
					onMouseDown={(e) => {
						e.preventDefault();
						ref.current?.insertTrigger("/");
					}}
				>
					<span style={{ fontWeight: 700 }}>/</span> Command
				</button>
				<button
					type="button"
					onMouseDown={(e) => {
						e.preventDefault();
						ref.current?.insertText("👍");
					}}
				>
					👍
				</button>
				<button
					type="button"
					onMouseDown={(e) => {
						e.preventDefault();
						ref.current?.insertText("🔥");
					}}
				>
					🔥
				</button>
			</div>
		</section>
	);
}

function ProgrammaticDemo() {
	const ref = useRef<MentionsHandle>(null);

	return (
		<section>
			<h2>Programmatic control</h2>
			<p className="desc">
				<code>ref.focus()</code>, <code>ref.clear()</code>, <code>ref.getValue()</code>,{" "}
				<code>ref.insertText()</code>
			</p>
			<Mentions
				ref={ref}
				triggers={[{ char: "@", data: users, color: "oklch(0.90 0.08 240)" }]}
				placeholder="Type something, then use the buttons below..."
			/>
			<div style={{ display: "flex", gap: 8, marginTop: 8 }}>
				<button type="button" onClick={() => ref.current?.focus()}>
					Focus
				</button>
				<button type="button" onClick={() => ref.current?.clear()}>
					Clear
				</button>
				<button type="button" onClick={() => ref.current?.insertText("Hello! ")}>
					Insert "Hello! "
				</button>
				<button
					type="button"
					onClick={() => {
						const val = ref.current?.getValue();
						if (val) alert(`Markup: ${val.markup}\nPlain: ${val.plainText}`);
					}}
				>
					Get Value
				</button>
			</div>
		</section>
	);
}

function GhostTextDemo() {
	const [ghost, setGhost] = useState("");

	const suggestions: Record<string, string> = {
		hello: " world! How can I help you today?",
		please: " review the latest changes and let me know",
		"can you": " help me with the data transformation?",
		"I need": " to merge these two datasets by customer ID",
		transform: " the CSV file and normalize all column names",
	};

	const handleChange = (_markup: string, plainText: string) => {
		const lower = plainText.toLowerCase().trimEnd();
		const match = Object.entries(suggestions).find(([key]) => lower.endsWith(key));
		setGhost(match ? match[1] : "");
	};

	return (
		<section>
			<h2>Ghost text (AI inline completion)</h2>
			<p className="desc">
				Type <code>hello</code>, <code>please</code>, or <code>can you</code> — a dimmed suggestion
				appears. Press <kbd>Tab</kbd> to accept.
			</p>
			<Mentions
				triggers={[{ char: "@", data: users, color: "oklch(0.90 0.08 240)" }]}
				placeholder="Type 'hello' to see ghost text..."
				ghostText={ghost}
				onChange={handleChange}
				onAcceptGhostText={() => setGhost("")}
			/>
		</section>
	);
}

function CSSEffectsDemo() {
	return (
		<section>
			<h2>CSS effects (opt-in)</h2>
			<p className="desc">
				Import <code>@skyastrall/mentions-react/effects.css</code> and add classes:
				<code>mentions-gradient-border</code>, <code>mentions-glow</code>,{" "}
				<code>mentions-animate</code>, <code>mentions-shimmer</code>
			</p>
			<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
				<div>
					<p className="desc" style={{ margin: "0 0 8px" }}>
						Gradient border on focus:
					</p>
					<Mentions
						className="mentions-gradient-border"
						triggers={[{ char: "@", data: users, color: "oklch(0.90 0.08 240)" }]}
						placeholder="Click to see the animated gradient border..."
					/>
				</div>
				<div>
					<p className="desc" style={{ margin: "0 0 8px" }}>
						Glow on focus:
					</p>
					<Mentions
						className="mentions-glow"
						triggers={[{ char: "@", data: users, color: "oklch(0.90 0.08 240)" }]}
						placeholder="Click to see the glow effect..."
					/>
				</div>
			</div>
		</section>
	);
}

function SingleLineDemo() {
	return (
		<section>
			<h2>Single-line mode</h2>
			<p className="desc">
				<code>singleLine</code> renders an <code>&lt;input&gt;</code> instead of{" "}
				<code>&lt;textarea&gt;</code>. Enter closes dropdown, doesn't add newline.
			</p>
			<Mentions
				singleLine
				triggers={[
					{ char: "@", data: users, color: "oklch(0.90 0.08 240)" },
					{ char: "/", data: commands, color: "oklch(0.92 0.08 80)" },
				]}
				placeholder="Single-line: @mention or /command..."
			/>
		</section>
	);
}

function AsyncDemo() {
	const fetchUsers = async (query: string): Promise<MentionItem[]> => {
		await new Promise((r) => setTimeout(r, 800));
		return users.filter((u) => u.label.toLowerCase().includes(query.toLowerCase()));
	};

	return (
		<section>
			<h2>Async data with loading state</h2>
			<p className="desc">Simulates 800ms API call. Shows "Loading..." in dropdown.</p>
			<Mentions
				triggers={[{ char: "@", data: fetchUsers, debounce: 300 }]}
				placeholder="Type @ and wait for async results..."
			/>
		</section>
	);
}

function DisabledReadOnlyDemo() {
	return (
		<section>
			<h2>Disabled & ReadOnly</h2>
			<div style={{ display: "flex", gap: 16 }}>
				<div style={{ flex: 1 }}>
					<p className="desc">Disabled</p>
					<Mentions
						triggers={[{ char: "@", data: users }]}
						defaultValue="Hey @[Alice Johnson](1) "
						disabled
					/>
				</div>
				<div style={{ flex: 1 }}>
					<p className="desc">Read only</p>
					<Mentions
						triggers={[{ char: "@", data: users }]}
						defaultValue="Hey @[Alice Johnson](1) "
						readOnly
					/>
				</div>
			</div>
		</section>
	);
}

function HeadlessDemo() {
	const triggers: TriggerConfig[] = [
		{ char: "@", data: users },
		{ char: "#", data: tags },
	];

	const {
		inputProps,
		listProps,
		getItemProps,
		isOpen,
		items,
		highlightedIndex,
		state,
		textareaRef,
		caretPosition,
	} = useMentions({ triggers });

	return (
		<section>
			<h2>Headless hook</h2>
			<p className="desc">
				<code>useMentions()</code> — full control, bring your own UI.
			</p>
			<div style={{ position: "relative" }}>
				<textarea
					ref={textareaRef}
					{...(inputProps as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
					placeholder="Headless: type @ or #..."
					style={{
						width: "100%",
						minHeight: 100,
						padding: 12,
						border: "1px solid #e2e8f0",
						borderRadius: 8,
						fontSize: 15,
						lineHeight: 1.5,
						fontFamily: "inherit",
						boxSizing: "border-box",
						resize: "vertical",
					}}
				/>
				{isOpen && items.length > 0 && (
					<ul
						{...(listProps as React.HTMLAttributes<HTMLUListElement>)}
						onMouseDown={(e) => e.preventDefault()}
						style={{
							position: "absolute",
							top: caretPosition ? caretPosition.top + caretPosition.height + 4 : "100%",
							left: caretPosition ? caretPosition.left : 0,
							listStyle: "none",
							margin: 0,
							padding: "4px 0",
							background: "white",
							border: "1px solid #e2e8f0",
							borderRadius: 8,
							boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
							minWidth: 200,
							maxHeight: 200,
							overflowY: "auto",
							zIndex: 10,
						}}
					>
						{items.map((item, i) => (
							<li
								key={item.id}
								{...(getItemProps(i) as React.LiHTMLAttributes<HTMLLIElement>)}
								style={{
									padding: "8px 12px",
									cursor: "pointer",
									backgroundColor: i === highlightedIndex ? "#f1f5f9" : "transparent",
								}}
							>
								{item.label}
							</li>
						))}
					</ul>
				)}
			</div>
			<div className="debug">
				<strong>Status:</strong> {state.status} &nbsp;|&nbsp;
				<strong>Trigger:</strong> {state.activeTrigger ?? "none"} &nbsp;|&nbsp;
				<strong>Query:</strong> "{state.query}" &nbsp;|&nbsp;
				<strong>Items:</strong> {items.length}
			</div>
		</section>
	);
}

function App() {
	return (
		<div className="container">
			<header>
				<h1>@skyastrall/mentions</h1>
				<p>Trigger-based inline suggestions for React</p>
			</header>
			<DropInDemo />
			<FormattingDemo />
			<CustomRenderDemo />
			<MinCharsDemo />
			<OnRemoveDemo />
			<ToolbarDemo />
			<GhostTextDemo />
			<CSSEffectsDemo />
			<ProgrammaticDemo />
			<SingleLineDemo />
			<AsyncDemo />
			<DisabledReadOnlyDemo />
			<HeadlessDemo />
			<style>{`
				* { box-sizing: border-box; }
				body { margin: 0; background: #fafafa; color: #1a1a1a; }
				.container { max-width: 640px; margin: 0 auto; padding: 40px 20px 80px; font-family: system-ui, -apple-system, sans-serif; }
				header { margin-bottom: 40px; }
				header h1 { font-size: 28px; margin: 0 0 4px; }
				header p { color: #64748b; margin: 0; }
				section { margin-bottom: 24px; padding: 24px; background: white; border: 1px solid #e2e8f0; border-radius: 12px; }
				section h2 { font-size: 18px; margin: 0 0 4px; }
				.desc { color: #64748b; font-size: 14px; margin: 0 0 16px; line-height: 1.5; }
				.desc code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
				.debug { margin-top: 12px; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px; }
				.debug pre { margin: 4px 0 8px; white-space: pre-wrap; word-break: break-all; font-size: 12px; color: #475569; }
				.debug strong { color: #334155; }
				button { padding: 6px 14px; border: 1px solid #e2e8f0; border-radius: 6px; background: white; cursor: pointer; font-size: 13px; font-family: inherit; }
				button:hover { background: #f8fafc; border-color: #cbd5e1; }
				button:active { background: #f1f5f9; }
				[data-mentions] {
					--mention-radius: 4px;
					--dropdown-bg: white;
					--dropdown-border: 1px solid #e2e8f0;
					--dropdown-radius: 8px;
					--dropdown-shadow: 0 4px 16px rgba(0,0,0,0.1);
					--item-active-bg: #f1f5f9;
					--item-padding: 8px 12px;
				}
				[data-mentions] textarea, [data-mentions] input {
					width: 100%; padding: 12px;
					border: 1px solid #e2e8f0; border-radius: 8px;
					font-size: 15px; line-height: 1.5; font-family: inherit;
				}
				[data-mentions] textarea { min-height: 100px; resize: vertical; }
				[data-mentions] textarea:focus, [data-mentions] input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.15); }
				[data-mentions] textarea:disabled, [data-mentions] input:disabled { opacity: 0.5; cursor: not-allowed; background: #f8fafc; }
				[data-mentions] textarea[readonly], [data-mentions] input[readonly] { background: #f8fafc; }
				[data-mentions] [aria-hidden="true"] {
					padding: 12px; border: 1px solid transparent;
					font-size: 15px; line-height: 1.5; font-family: inherit;
				}
			`}</style>
		</div>
	);
}

export default App;
