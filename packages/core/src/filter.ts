import type { MentionItem } from "./types.ts";

/** Filter mention items by case-insensitive substring match against the label. */
export function filterItems(items: MentionItem[], query: string): MentionItem[] {
	if (!query) return items;
	const lower = query.toLowerCase();
	return items.filter((item) => item.label.toLowerCase().includes(lower));
}
