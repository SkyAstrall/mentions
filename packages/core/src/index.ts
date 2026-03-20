export { getCaretCoordinates } from "./caret.ts";
export { connect } from "./connect.ts";
export { filterItems } from "./filter.ts";
export { createInitialState, initialState, mentionReducer } from "./machine.ts";
export {
	applyChange,
	createMentionMarkup,
	extractMentions,
	getMarkupTemplate,
	insertMention,
	markupToPlainText,
	parseMarkup,
	plainIndexToMarkupIndex,
	toPlainText,
} from "./markup.ts";
export type { TriggerMatch } from "./triggers.ts";
export { detectTrigger } from "./triggers.ts";
export type {
	CaretPosition,
	ConnectReturn,
	MachineStatus,
	MentionAction,
	MentionCallbacks,
	MentionContext,
	MentionItem,
	MentionSegment,
	MentionState,
	Segment,
	TextSegment,
	TriggerConfig,
} from "./types.ts";
export { escapeRegex } from "./utils.ts";
