import { type EnvironmentProviders, makeEnvironmentProviders } from "@angular/core";
import { MENTIONS_CONFIG, type MentionsGlobalConfig } from "./tokens";

export function provideMentions(config: MentionsGlobalConfig = {}): EnvironmentProviders {
	return makeEnvironmentProviders([{ provide: MENTIONS_CONFIG, useValue: config }]);
}
