import type { MentionItem, MentionSegment, Segment, TriggerConfig } from "./types.ts";
import { escapeRegex } from "./utils.ts";

const DISPLAY_PLACEHOLDER = "__display__";
const ID_PLACEHOLDER = "__id__";

const regexCache = new Map<string, RegExp>();

/** Get the markup template for a trigger, falling back to the default `@[Display](ID)` format. */
export function getMarkupTemplate(trigger: TriggerConfig): string {
	return trigger.markup ?? `${trigger.char}[${DISPLAY_PLACEHOLDER}](${ID_PLACEHOLDER})`;
}

/**
 * Build a regex that matches a mention in the given markup template.
 *
 * Analyzes the actual delimiter characters surrounding each placeholder to
 * generate correct negated character classes, instead of hardcoding `]` and `)`.
 */
function buildMentionRegex(template: string): RegExp {
	const displayIdx = template.indexOf(DISPLAY_PLACEHOLDER);
	const idIdx = template.indexOf(ID_PLACEHOLDER);

	if (displayIdx === -1 || idIdx === -1) {
		return new RegExp(escapeRegex(template), "g");
	}

	const displayEnd = displayIdx + DISPLAY_PLACEHOLDER.length;
	const idEnd = idIdx + ID_PLACEHOLDER.length;

	const charAfterDisplay = displayEnd < template.length ? template[displayEnd] : "";
	const charAfterId = idEnd < template.length ? template[idEnd] : "";

	const escaped = escapeRegex(template);

	const displayCapture = charAfterDisplay ? `([^${escapeRegex(charAfterDisplay)}]+)` : "(.+)";
	const idCapture = charAfterId ? `([^${escapeRegex(charAfterId)}]+)` : "(.+)";

	const withCaptures = escaped
		.replace(escapeRegex(DISPLAY_PLACEHOLDER), displayCapture)
		.replace(escapeRegex(ID_PLACEHOLDER), idCapture);

	return new RegExp(withCaptures, "g");
}

/**
 * Escape characters in `value` that would break the markup template's delimiters.
 *
 * Looks at the characters immediately after each placeholder in the template
 * and backslash-escapes those characters in the value.
 */
function escapeForTemplate(value: string, template: string, placeholder: string): string {
	const idx = template.indexOf(placeholder);
	if (idx === -1) return value;

	const afterIdx = idx + placeholder.length;
	if (afterIdx >= template.length) return value;

	const delimiter = template[afterIdx];
	return value.replace(new RegExp(escapeRegex(delimiter), "g"), `\\${delimiter}`);
}

/**
 * Parse a markup string into an array of text and mention segments.
 *
 * Each mention segment contains the display text, id, trigger character,
 * and its start/end positions within the original markup string.
 */
export function parseMarkup(markup: string, triggers: TriggerConfig[]): Segment[] {
	if (!markup) return [];

	const patterns: Array<{ regex: RegExp; trigger: string }> = [];
	for (const t of triggers) {
		const template = getMarkupTemplate(t);
		let regex = regexCache.get(template);
		if (!regex) {
			regex = buildMentionRegex(template);
			regexCache.set(template, regex);
		}
		regex.lastIndex = 0;
		patterns.push({ regex, trigger: t.char });
	}

	type Match = { index: number; length: number; display: string; id: string; trigger: string };
	const matches: Match[] = [];

	for (const p of patterns) {
		let m: RegExpExecArray | null;
		// biome-ignore lint/suspicious/noAssignInExpressions: standard regex exec loop
		while ((m = p.regex.exec(markup)) !== null) {
			matches.push({
				index: m.index,
				length: m[0].length,
				display: m[1],
				id: m[2],
				trigger: p.trigger,
			});
		}
	}

	matches.sort((a, b) => a.index - b.index);

	let end = 0;
	const filtered: Match[] = [];
	for (const m of matches) {
		if (m.index >= end) {
			filtered.push(m);
			end = m.index + m.length;
		}
	}

	const segments: Segment[] = [];
	let cursor = 0;

	for (const match of filtered) {
		if (match.index > cursor) {
			segments.push({
				type: "text",
				text: markup.slice(cursor, match.index),
				markupStart: cursor,
				markupEnd: match.index,
			});
		}

		segments.push({
			type: "mention",
			text: `${match.trigger}${match.display}`,
			id: match.id,
			trigger: match.trigger,
			markupStart: match.index,
			markupEnd: match.index + match.length,
		});

		cursor = match.index + match.length;
	}

	if (cursor < markup.length) {
		segments.push({
			type: "text",
			text: markup.slice(cursor),
			markupStart: cursor,
			markupEnd: markup.length,
		});
	}

	return segments;
}

/** Concatenate the display text of all segments into a plain text string. */
export function toPlainText(segments: Segment[]): string {
	return segments.map((s) => s.text).join("");
}

/** Convert a markup string directly to plain text. */
export function markupToPlainText(markup: string, triggers: TriggerConfig[]): string {
	return toPlainText(parseMarkup(markup, triggers));
}

/**
 * Map a cursor position in plain text to the corresponding position in markup.
 *
 * If the plain index falls inside a mention's display text, it snaps to the
 * end of that mention's markup token.
 */
export function plainIndexToMarkupIndex(segments: Segment[], plainIndex: number): number {
	let plainCursor = 0;

	for (const seg of segments) {
		const segLen = seg.text.length;

		if (plainIndex <= plainCursor + segLen) {
			if (seg.type === "mention") {
				return seg.markupEnd;
			}
			const offset = plainIndex - plainCursor;
			return seg.markupStart + offset;
		}

		plainCursor += segLen;
	}

	return segments.length > 0 ? segments[segments.length - 1].markupEnd : 0;
}

/**
 * Compute the new markup string after a plain-text edit.
 *
 * Diffs `oldPlainText` against `newPlainText` to find the changed region,
 * maps it back to the markup coordinate space (expanding across any mention
 * boundaries that were partially edited), and splices in the new text.
 */
export function applyChange(
	oldMarkup: string,
	newPlainText: string,
	oldPlainText: string,
	triggers: TriggerConfig[],
): string {
	if (oldPlainText === newPlainText) return oldMarkup;

	const segments = parseMarkup(oldMarkup, triggers);
	const oldLen = oldPlainText.length;
	const newLen = newPlainText.length;

	let prefixLen = 0;
	while (
		prefixLen < oldLen &&
		prefixLen < newLen &&
		oldPlainText[prefixLen] === newPlainText[prefixLen]
	) {
		prefixLen++;
	}

	let suffixLen = 0;
	while (
		suffixLen < oldLen - prefixLen &&
		suffixLen < newLen - prefixLen &&
		oldPlainText[oldLen - 1 - suffixLen] === newPlainText[newLen - 1 - suffixLen]
	) {
		suffixLen++;
	}

	let plainDeleteStart = prefixLen;
	let plainDeleteEnd = oldLen - suffixLen;

	let plainCursor = 0;
	let markupDeleteStart = oldMarkup.length;
	let markupDeleteEnd = oldMarkup.length;
	let foundStart = false;
	let foundEnd = false;

	for (const seg of segments) {
		const segPlainStart = plainCursor;
		const segPlainEnd = plainCursor + seg.text.length;

		if (!foundStart && plainDeleteStart < segPlainEnd) {
			if (seg.type === "mention") {
				markupDeleteStart = seg.markupStart;
				plainDeleteStart = segPlainStart;
			} else {
				markupDeleteStart = seg.markupStart + (plainDeleteStart - segPlainStart);
			}
			foundStart = true;
		}

		if (foundStart && plainDeleteEnd <= segPlainEnd) {
			if (seg.type === "mention" && plainDeleteEnd > segPlainStart) {
				markupDeleteEnd = seg.markupEnd;
				plainDeleteEnd = segPlainEnd;
			} else {
				markupDeleteEnd = seg.markupStart + (plainDeleteEnd - segPlainStart);
			}
			foundEnd = true;
			break;
		}

		plainCursor = segPlainEnd;
	}

	if (!foundStart) {
		markupDeleteStart = oldMarkup.length;
	}
	if (!foundEnd) {
		markupDeleteEnd = oldMarkup.length;
	}

	const newPlainStart = plainDeleteStart;
	const newPlainEnd = newLen - (oldLen - plainDeleteEnd);
	const insertedText = newPlainText.slice(newPlainStart, newPlainEnd);

	return oldMarkup.slice(0, markupDeleteStart) + insertedText + oldMarkup.slice(markupDeleteEnd);
}

/**
 * Build the markup string for a single mention.
 *
 * Escapes delimiter characters in `item.label` and `item.id` to prevent
 * them from breaking the template structure.
 */
export function createMentionMarkup(item: MentionItem, trigger: TriggerConfig): string {
	const template = getMarkupTemplate(trigger);
	const escapedLabel = escapeForTemplate(item.label, template, DISPLAY_PLACEHOLDER);
	const escapedId = escapeForTemplate(item.id, template, ID_PLACEHOLDER);
	return template.replace(DISPLAY_PLACEHOLDER, escapedLabel).replace(ID_PLACEHOLDER, escapedId);
}

/**
 * Insert a mention into the current markup, replacing the trigger+query region.
 *
 * Returns the new markup, plain text, and cursor position after insertion.
 */
export function insertMention(
	currentMarkup: string,
	item: MentionItem,
	trigger: TriggerConfig,
	queryStartIndex: number,
	queryEndIndex: number,
	triggers: TriggerConfig[],
): { markup: string; plainText: string; cursor: number } {
	const segments = parseMarkup(currentMarkup, triggers);
	const markupStart = plainIndexToMarkupIndex(segments, queryStartIndex);

	let plainCursor = 0;
	let markupEndPos = markupStart;
	for (const seg of segments) {
		const segPlainEnd = plainCursor + seg.text.length;
		if (queryEndIndex <= segPlainEnd) {
			markupEndPos = seg.markupStart + (queryEndIndex - plainCursor);
			break;
		}
		plainCursor = segPlainEnd;
	}

	const mentionMarkup = createMentionMarkup(item, trigger);
	const textAfter = currentMarkup.slice(markupEndPos);
	const needsSpace = textAfter.length === 0 || !/^\s/.test(textAfter);
	const separator = needsSpace ? " " : "";

	const newMarkup = currentMarkup.slice(0, markupStart) + mentionMarkup + separator + textAfter;

	const newSegments = parseMarkup(newMarkup, triggers);
	const newPlainText = toPlainText(newSegments);
	const cursor = queryStartIndex + trigger.char.length + item.label.length + (needsSpace ? 1 : 0);

	return { markup: newMarkup, plainText: newPlainText, cursor };
}

/** Extract all mentions from a markup string as `MentionItem` objects. */
export function extractMentions(markup: string, triggers: TriggerConfig[]): MentionItem[] {
	const segments = parseMarkup(markup, triggers);
	return segments
		.filter((s): s is MentionSegment => s.type === "mention")
		.map((s) => ({ id: s.id, label: s.text.slice(s.trigger.length) }));
}
