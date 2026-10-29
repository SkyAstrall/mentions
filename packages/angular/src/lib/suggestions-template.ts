import { Directive, inject, TemplateRef } from "@angular/core";
import type { ConnectReturn, ListScrollGeometry } from "@skyastrall/mentions-core";

export type MentionsSuggestionsContext = ConnectReturn & {
	selectAt: (index: number) => void;
	loadMore: () => void;
	handleListScroll: (geometry: ListScrollGeometry) => void;
};

@Directive({ selector: "ng-template[saMentionsSuggestions]", standalone: true })
export class SaMentionsSuggestions {
	readonly template = inject<TemplateRef<{ $implicit: MentionsSuggestionsContext }>>(TemplateRef);
	static ngTemplateContextGuard(
		_directive: SaMentionsSuggestions,
		context: unknown,
	): context is { $implicit: MentionsSuggestionsContext } {
		return true;
	}
}
