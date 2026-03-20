import type { TriggerConfig } from "./types.ts";

export type TriggerMatch = {
	trigger: TriggerConfig;
	query: string;
	startIndex: number;
	endIndex: number;
} | null;

/**
 * Detect an active trigger in `plainText` at the given `cursorPosition`.
 *
 * Uses a backward character scan from the cursor (O(n), no regex backtracking)
 * to find the last trigger char preceded by start-of-string or whitespace,
 * then validates the query portion against the trigger's settings.
 */
export function detectTrigger(
	plainText: string,
	cursorPosition: number,
	triggers: TriggerConfig[],
): TriggerMatch {
	if (cursorPosition <= 0) return null;

	const textBeforeCursor = plainText.slice(0, cursorPosition);
	const sorted = [...triggers].sort((a, b) => b.char.length - a.char.length);

	for (const trigger of sorted) {
		const triggerChar = trigger.char;
		const triggerLen = triggerChar.length;

		let scanPos = textBeforeCursor.length - 1;
		while (scanPos >= 0) {
			const candidateStart = scanPos - triggerLen + 1;
			if (candidateStart < 0) break;

			const candidate = textBeforeCursor.slice(candidateStart, candidateStart + triggerLen);
			if (candidate !== triggerChar) {
				scanPos--;
				continue;
			}

			const beforeTrigger = candidateStart === 0 ? "" : textBeforeCursor[candidateStart - 1];
			if (beforeTrigger !== "" && !/\s/.test(beforeTrigger)) {
				scanPos = candidateStart - 1;
				continue;
			}

			const query = textBeforeCursor.slice(candidateStart + triggerLen);

			if (!trigger.allowSpaceInQuery && /\s/.test(query)) {
				scanPos = candidateStart - 1;
				continue;
			}

			const minChars = trigger.minChars ?? 0;
			if (query.length < minChars) {
				scanPos = candidateStart - 1;
				continue;
			}

			const startIndex = candidateStart;
			return {
				trigger,
				query,
				startIndex,
				endIndex: cursorPosition,
			};
		}
	}

	return null;
}
