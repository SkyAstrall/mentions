import { Mentions } from "@skyastrall/mentions-react";
import { users, tags, commands } from "../../data/mock";

export default function HeroDemo() {
	return (
		<div className="hero-demo">
			<Mentions
				triggers={[
					{ char: "@", data: users, color: "rgba(99,102,241,0.3)" },
					{ char: "#", data: tags, color: "rgba(16,185,129,0.3)" },
					{ char: "/", data: commands, color: "rgba(245,158,11,0.3)" },
				]}
				defaultValue="Hey @[Alice Johnson](1), can you review #[feature](t3) and run /[assign](c1)?"
				placeholder="Keep typing — try @ # or / ..."
				className="hero-editor"
			/>
			<style>{`
				.hero-demo {
					position: relative;
					max-width: 640px;
					margin: 0 auto;
					padding: 2px;
					border-radius: 16px;
					background: linear-gradient(180deg, rgba(139,47,201,0.15) 0%, rgba(139,47,201,0.03) 100%);
				}
				:global(html.light) .hero-demo {
					background: linear-gradient(180deg, rgba(104,24,165,0.1) 0%, rgba(104,24,165,0.02) 100%);
				}
				.hero-demo::before {
					content: '';
					position: absolute;
					inset: -60px;
					background-image: radial-gradient(rgba(139,47,201,0.06) 1px, transparent 1px);
					background-size: 24px 24px;
					mask-image: radial-gradient(ellipse at center, black 20%, transparent 70%);
					pointer-events: none;
					z-index: -1;
				}
				.hero-demo [data-mentions] {
					--mention-radius: 4px;
					--dropdown-bg: var(--color-bg-elevated);
					--dropdown-border: 1px solid var(--color-border);
					--dropdown-radius: 12px;
					--dropdown-shadow: 0 8px 32px rgba(0,0,0,0.3);
					--item-active-bg: var(--color-accent-muted);
					--item-padding: 10px 14px;
					--mention-placeholder: var(--color-text-dim);
				}
				.hero-editor {
					width: 100%;
					min-height: 64px;
					padding: 20px;
					border: none;
					border-radius: 14px;
					font-family: 'Inter', system-ui, sans-serif;
					font-size: 15px;
					line-height: 1.6;
					box-sizing: border-box;
					color: var(--color-text);
					background: var(--color-bg-subtle);
					box-shadow:
						0 0 0 1px var(--color-border),
						0 2px 4px rgba(0,0,0,0.1),
						0 8px 32px rgba(0,0,0,0.15),
						0 0 80px rgba(139,47,201,0.04);
					transition: box-shadow 300ms cubic-bezier(0.16, 1, 0.3, 1);
				}
				.hero-editor:focus {
					box-shadow:
						0 0 0 1px rgba(139,47,201,0.4),
						0 0 0 4px rgba(139,47,201,0.12),
						0 8px 32px rgba(0,0,0,0.15),
						0 0 80px rgba(139,47,201,0.08);
					outline: none;
				}
				.hero-demo [data-mentions-portal] ul {
					color: var(--color-text);
					backdrop-filter: blur(12px);
				}
				.hero-demo [data-mentions-portal] li {
					font-size: 14px;
					border-radius: 6px;
					margin: 2px 4px;
				}
			`}</style>
		</div>
	);
}
