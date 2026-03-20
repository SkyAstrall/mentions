export { useMentions } from "./use-mentions.ts";
export type { UseMentionsOptions, UseMentionsReturn } from "./use-mentions.ts";

export { Mentions } from "./mentions.tsx";
export type { MentionsProps, MentionsHandle } from "./mentions.tsx";

export type {
	MentionItem,
	MentionContext,
	TriggerConfig,
	MentionCallbacks,
	CaretPosition,
} from "@skyastrall/mentions-core";

export { extractMentions, markupToPlainText, parseMarkup } from "@skyastrall/mentions-core";
