import type { TriggerConfig } from "./types.ts";

export type TriggerMatch = {
	trigger: TriggerConfig;
	query: string;
	startIndex: number;
	endIndex: number;
} | null;

/**
 * Maximum distance (in characters) the backward scan travels from the cursor.
 *
 * Bounds trigger detection to O(1) per keystroke regardless of document size.
 * No real mention query approaches this length; without the bound, a single
 * keystroke at the end of a large pasted document scans the entire text.
 */
export const MAX_QUERY_LOOKBACK = 256;

const WHITESPACE = /\s/;

/**
 * Detect an active trigger in `plainText` at the given `cursorPosition`.
 *
 * Scans backward from the cursor, stopping at the first whitespace
 * (or newline, for triggers that allow spaces in the query) and never
 * traveling more than `MAX_QUERY_LOOKBACK` characters. Stopping early is
 * sound: any candidate further back would have that boundary character
 * inside its query and be rejected anyway.
 */
export function detectTrigger(
	plainText: string,
	cursorPosition: number,
	triggers: TriggerConfig[],
): TriggerMatch {
	if (cursorPosition <= 0) return null;

	const sorted =
		triggers.length > 1 ? [...triggers].sort((a, b) => b.char.length - a.char.length) : triggers;
	const floor = Math.max(0, cursorPosition - MAX_QUERY_LOOKBACK);

	for (const trigger of sorted) {
		const triggerChar = trigger.char;
		const triggerLen = triggerChar.length;

		for (let scanPos = cursorPosition - 1; scanPos >= floor; scanPos--) {
			const ch = plainText[scanPos];
			const isBoundary = trigger.allowSpaceInQuery ? ch === "\n" : WHITESPACE.test(ch);

			const candidateStart = scanPos - triggerLen + 1;
			if (candidateStart >= 0 && matchesAt(plainText, triggerChar, candidateStart)) {
				const beforeTrigger = candidateStart === 0 ? "" : plainText[candidateStart - 1];
				if (beforeTrigger === "" || WHITESPACE.test(beforeTrigger)) {
					const query = plainText.slice(candidateStart + triggerLen, cursorPosition);
					const minChars = trigger.minChars ?? 0;

					if ((trigger.allowSpaceInQuery || !WHITESPACE.test(query)) && query.length >= minChars) {
						return {
							trigger,
							query,
							startIndex: candidateStart,
							endIndex: cursorPosition,
						};
					}
				}
			}

			// All candidates containing this boundary character inside their
			// trigger text were already tested at higher scan positions, so
			// everything further back can only fail the query check.
			if (isBoundary) break;
		}
	}

	return null;
}

function matchesAt(text: string, needle: string, start: number): boolean {
	for (let i = 0; i < needle.length; i++) {
		if (text[start + i] !== needle[i]) return false;
	}
	return true;
}
