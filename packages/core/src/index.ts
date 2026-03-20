export { mentionReducer, initialState, createInitialState } from "./machine.ts";

export {
	parseMarkup,
	toPlainText,
	markupToPlainText,
	plainIndexToMarkupIndex,
	applyChange,
	createMentionMarkup,
	insertMention,
	extractMentions,
	getMarkupTemplate,
} from "./markup.ts";

export { detectTrigger } from "./triggers.ts";
export type { TriggerMatch } from "./triggers.ts";

export { filterItems } from "./filter.ts";

export { getCaretCoordinates } from "./caret.ts";

export { connect } from "./connect.ts";

export { escapeRegex } from "./utils.ts";

export type {
	MentionItem,
	MentionContext,
	TriggerConfig,
	Segment,
	TextSegment,
	MentionSegment,
	CaretPosition,
	MachineStatus,
	MentionState,
	MentionAction,
	MentionCallbacks,
	ConnectReturn,
} from "./types.ts";
