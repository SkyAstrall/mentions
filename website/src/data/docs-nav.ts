export type NavItem = {
	label: string;
	href: string;
};

export type NavSection = {
	title: string;
	items: NavItem[];
};

export const docsNav: NavSection[] = [
	{
		title: "Getting Started",
		items: [
			{ label: "Introduction", href: "/docs" },
			{ label: "Installation", href: "/docs/installation" },
			{ label: "Quick Start", href: "/docs/quick-start" },
		],
	},
	{
		title: "Guides",
		items: [
			{ label: "Compound Components", href: "/docs/guides/compound-components" },
			{ label: "Headless Usage", href: "/docs/guides/headless-hook" },
			{ label: "Async Data", href: "/docs/guides/async-data" },
			{ label: "Single Line", href: "/docs/guides/single-line" },
			{ label: "Ghost Text / AI", href: "/docs/guides/ghost-text" },
			{ label: "Styling", href: "/docs/guides/styling" },
		],
	},
	{
		title: "API Reference",
		items: [
			{ label: "Mentions Component", href: "/docs/api/mentions" },
			{ label: "useMentions", href: "/docs/api/use-mentions" },
			{ label: "Trigger Config", href: "/docs/api/trigger-config" },
			{ label: "Utilities", href: "/docs/api/utilities" },
		],
	},
	{
		title: "More",
		items: [
			{ label: "Migration v0.3.0 → v0.3.1", href: "/docs/migration/v0-3-0-to-v0-3-1" },
			{ label: "Migration v0.2 → v0.3", href: "/docs/migration/v0-2-to-v0-3" },
			{ label: "Migration v0.1 → v0.2", href: "/docs/migration/v0-1-to-v0-2" },
		],
	},
];
