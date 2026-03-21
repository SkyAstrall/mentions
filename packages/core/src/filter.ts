import type { MentionItem } from "./types.ts";

/** Filter mention items by case-insensitive substring match against the label. */
export function filterItems<T extends MentionItem>(items: T[], query: string): T[] {
	if (!query) return items;
	const lower = query.toLowerCase();
	return items.filter((item) => item.label.toLowerCase().includes(lower));
}
