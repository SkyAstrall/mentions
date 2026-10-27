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
const URL_OR_PATH_JOINERS = "/-#&=+~@\\";
const WORD_CONTINUATION = /[\p{N}\p{M}\p{Pc}]/u;
const CJK_OR_PUNCTUATION =
	/[\p{Script_Extensions=Han}\p{Script_Extensions=Hiragana}\p{Script_Extensions=Katakana}\p{Script_Extensions=Hangul}\p{Script_Extensions=Bopomofo}\p{P}]/u;

function isTriggerBoundary(text: string, start: number, trigger: TriggerConfig): boolean {
	if (start === 0) return true;
	if (trigger.startOfLine && text[start - 1] !== "\n") return false;
	let index = start - 1;
	const lastUnit = text.charCodeAt(index);
	if (lastUnit >= 0xdc00 && lastUnit <= 0xdfff && index > 0) {
		const previousUnit = text.charCodeAt(index - 1);
		if (previousUnit >= 0xd800 && previousUnit <= 0xdbff) index--;
	}
	const precedingCodePoint = text.slice(index, start);
	if (trigger.allowedPrefixes !== undefined) {
		return trigger.allowedPrefixes.includes(precedingCodePoint);
	}
	if (URL_OR_PATH_JOINERS.includes(precedingCodePoint)) return false;
	return (
		WHITESPACE.test(precedingCodePoint) ||
		(!WORD_CONTINUATION.test(precedingCodePoint) && CJK_OR_PUNCTUATION.test(precedingCodePoint))
	);
}

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
				if (isTriggerBoundary(plainText, candidateStart, trigger)) {
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
