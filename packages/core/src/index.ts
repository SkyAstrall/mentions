export { connect } from "./connect.ts";
export { MentionController } from "./controller.ts";
export {
	buildMentionHTML,
	escapeHTML,
	getCaretRect,
	getCursorOffset,
	getMarkupFromDOM,
	getPlainTextFromDOM,
	insertTextAtCursor,
	isExtensionNode,
	performMentionInsertion,
	restoreCursor,
} from "./dom.ts";
export { filterItems } from "./filter.ts";
export { createInitialState, mentionReducer } from "./machine.ts";
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
	InputAriaProps,
	ItemAriaProps,
	KeyDownResult,
	ListAriaProps,
	MachineStatus,
	MentionAction,
	MentionCallbacks,
	MentionContext,
	MentionControllerOptions,
	MentionItem,
	MentionSegment,
	MentionState,
	Segment,
	TextSegment,
	TriggerConfig,
} from "./types.ts";
