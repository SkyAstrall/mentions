export type {
	CaretPosition,
	ConnectReturn,
	InputAriaProps,
	ItemAriaProps,
	KeyDownResult,
	ListAriaProps,
	ListScrollGeometry,
	MachineStatus,
	MentionCallbacks,
	MentionContext,
	MentionControllerOptions,
	MentionGroup,
	MentionItem,
	MentionPage,
	MentionSegment,
	MentionState,
	Segment,
	SuggestionGroup,
	TextSegment,
	TriggerConfig,
} from "@skyastrall/mentions-core";
export {
	buildMentionHTML,
	connect,
	extractMentions,
	MentionController,
	markupToPlainText,
	parseMarkup,
} from "@skyastrall/mentions-core";
export { MentionsControllerBridge } from "./lib/controller-bridge";
export { provideMentions } from "./lib/provide-mentions";
export { SA_MENTIONS_VALUE_ACCESSOR, SaMentions } from "./lib/sa-mentions.component";
export { type MentionsSuggestionsContext, SaMentionsSuggestions } from "./lib/suggestions-template";
export { MENTIONS_CONFIG, type MentionsGlobalConfig } from "./lib/tokens";
