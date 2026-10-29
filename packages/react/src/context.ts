import type { TriggerConfig } from "@skyastrall/mentions-core";
import { createContext, useContext } from "react";
import type { UseMentionsReturn } from "./use-mentions-types.js";
export type MentionsContextValue = UseMentionsReturn & {
	triggers: TriggerConfig[];
	singleLine?: boolean;
};

export const MentionsContext: React.Context<MentionsContextValue | null> =
	createContext<MentionsContextValue | null>(null);

export function useMentionsContext(): MentionsContextValue {
	const ctx = useContext(MentionsContext);
	if (!ctx) {
		throw new Error("Mentions compound components must be used within <Mentions>");
	}
	return ctx;
}
