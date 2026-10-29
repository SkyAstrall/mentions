import type { MentionContext, MentionPage, TriggerConfig } from "@skyastrall/mentions-core";

const groups = [
	{ id: "people", label: "People" },
	{ id: "teams", label: "Teams" },
	{ id: "channels", label: "Channels" },
];

export const groupedTriggers: TriggerConfig[] = [{
	char: "@",
	groups,
	data: [
		{ id: "platform", label: "Platform", group: "teams" },
		{ id: "alice", label: "Alice", group: "people" },
		{ id: "general", label: "general", group: "channels" },
		{ id: "bob", label: "Bob", group: "people" },
	],
}];

const users = Array.from({ length: 10_000 }, (_, index) => ({
	id: String(index + 1),
	label: `User ${String(index + 1).padStart(5, "0")}`,
	group: "people",
}));

function delay(signal?: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		const abort = () => {
			clearTimeout(timer);
			reject(new DOMException("Aborted", "AbortError"));
		};
		const timer = setTimeout(() => {
			signal?.removeEventListener("abort", abort);
			resolve();
		}, 500);
		if (signal?.aborted) abort();
		else signal?.addEventListener("abort", abort, { once: true });
	});
}

async function fetchUsers(query: string, context: MentionContext): Promise<MentionPage> {
	await delay(context.signal);
	const filtered = users.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()));
	const start = typeof context.cursor === "number" ? context.cursor : 0;
	const end = start + 20;
	return { items: filtered.slice(start, end), hasMore: end < filtered.length, cursor: end };
}

export const paginatedTriggers: TriggerConfig[] = [{
	char: "@", groups, data: fetchUsers, debounce: 0,
}];
