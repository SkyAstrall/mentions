import { Mentions } from "@skyastrall/mentions-react";
import type { MentionItem } from "@skyastrall/mentions-react";

const users: MentionItem[] = [
	{ id: "1", label: "Alice Johnson" },
	{ id: "2", label: "Bob Smith" },
	{ id: "3", label: "Charlie Brown" },
	{ id: "4", label: "Diana Prince" },
	{ id: "5", label: "Eve Wilson" },
];

const tags: MentionItem[] = [
	{ id: "t1", label: "urgent" },
	{ id: "t2", label: "bug" },
	{ id: "t3", label: "feature" },
	{ id: "t4", label: "docs" },
];

const commands: MentionItem[] = [
	{ id: "c1", label: "assign" },
	{ id: "c2", label: "close" },
	{ id: "c3", label: "label" },
];

export default function HeroDemo() {
	return (
		<div className="hero-demo">
			<Mentions
				triggers={[
					{ char: "@", data: users, color: "oklch(0.75 0.15 250)" },
					{ char: "#", data: tags, color: "oklch(0.75 0.12 300)" },
					{ char: "/", data: commands, color: "oklch(0.80 0.12 80)" },
				]}
				placeholder="Try it — type @ for users, # for tags, / for commands..."
				className="hero-editor"
			/>
			<style>{`
				.hero-demo [data-mentions] {
					--mention-radius: 4px;
					--dropdown-bg: #18181b;
					--dropdown-border: 1px solid rgba(255,255,255,0.1);
					--dropdown-radius: 12px;
					--dropdown-shadow: 0 8px 32px rgba(0,0,0,0.5);
					--item-active-bg: rgba(99,102,241,0.2);
					--item-padding: 10px 14px;
					--mention-placeholder: #71717a;
				}
				.hero-editor {
					width: 100%;
					min-height: 120px;
					padding: 16px;
					border: 1px solid rgba(255,255,255,0.1);
					border-radius: 12px;
					font-family: 'Inter', system-ui, sans-serif;
					font-size: 16px;
					line-height: 1.6;
					box-sizing: border-box;
					color: #fafafa;
					background: rgba(255,255,255,0.03);
				}
				.hero-editor:focus {
					border-color: #6366f1;
					box-shadow: 0 0 0 3px rgba(99,102,241,0.2);
				}
				.hero-demo [data-mentions-portal] ul {
					color: #fafafa;
				}
				.hero-demo [data-mentions-portal] li {
					font-size: 14px;
					border-radius: 6px;
					margin: 2px 4px;
					cursor: pointer;
				}
			`}</style>
		</div>
	);
}
