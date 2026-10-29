import type { MentionGroup, MentionItem, SuggestionGroup } from "./types.ts";

export function groupSuggestions(items: MentionItem[], configured: MentionGroup[] = []) {
	if (!items.some((item) => item.group !== undefined)) return { items, groups: [] };
	const buckets = new Map<string | null, MentionItem[]>();
	for (const item of items) {
		const id = item.group ?? null;
		const bucket = buckets.get(id);
		if (bucket) bucket.push(item);
		else buckets.set(id, [item]);
	}
	const labels = new Map(configured.map((group) => [group.id, group.label]));
	const order = new Set([null, ...labels.keys(), ...buckets.keys()]);
	const groups: SuggestionGroup[] = [];
	const ordered: MentionItem[] = [];
	for (const id of order) {
		const bucket = buckets.get(id);
		if (!bucket) continue;
		groups.push({
			id,
			label: id === null ? null : (labels.get(id) ?? id),
			items: bucket,
			startIndex: ordered.length,
		});
		for (const item of bucket) ordered.push(item);
	}
	return { items: ordered, groups };
}

export function limitSuggestions(
	items: MentionItem[],
	configured?: MentionGroup[],
	limit?: number,
) {
	const grouped = groupSuggestions(items, configured);
	return limit === undefined
		? grouped
		: groupSuggestions(grouped.items.slice(0, limit), configured);
}
