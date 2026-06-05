export type {
	CaretPosition,
	ConnectReturn,
	InputAriaProps,
	ItemAriaProps,
	KeyDownResult,
	ListAriaProps,
	MachineStatus,
	MentionCallbacks,
	MentionContext,
	MentionControllerOptions,
	MentionItem,
	MentionSegment,
	MentionState,
	Segment,
	TextSegment,
	TriggerConfig,
} from "@skyastrall/mentions-core";
export {
	buildMentionHTML,
	extractMentions,
	MentionController,
	markupToPlainText,
	parseMarkup,
} from "@skyastrall/mentions-core";
export { MentionsControllerBridge } from "./lib/controller-bridge";
export { provideMentions } from "./lib/provide-mentions";
export { SA_MENTIONS_VALUE_ACCESSOR, SaMentions } from "./lib/sa-mentions.component";
export { MENTIONS_CONFIG, type MentionsGlobalConfig } from "./lib/tokens";
