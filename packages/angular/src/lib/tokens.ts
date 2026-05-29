import { InjectionToken } from "@angular/core";
import type { MentionControllerOptions } from "@skyastrall/mentions-core";

export interface MentionsGlobalConfig {
	filterFn?: NonNullable<MentionControllerOptions["filterFn"]>;
	onError?: (error: Error) => void;
}

export const MENTIONS_CONFIG = new InjectionToken<MentionsGlobalConfig>("Mentions global config");
