export type {
	MentionCallbacks,
	MentionControllerOptions,
	MentionItem,
	MentionSegment,
	MentionState,
	Segment,
	TextSegment,
	TriggerConfig,
} from "@skyastrall/mentions-core";
export { provideMentions } from "./lib/provide-mentions";
export { SA_MENTIONS_VALUE_ACCESSOR, SaMentions } from "./lib/sa-mentions.component";
export { MENTIONS_CONFIG, type MentionsGlobalConfig } from "./lib/tokens";
