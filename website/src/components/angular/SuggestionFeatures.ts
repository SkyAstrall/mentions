import { Component, signal } from "@angular/core";
import { SaMentions, SaMentionsSuggestions } from "@skyastrall/mentions-angular";
import { groupedTriggers, paginatedTriggers } from "../../data/suggestion-examples";
import { SuggestionHeadless } from "./SuggestionHeadless";
import { SuggestionList } from "./SuggestionList";

@Component({
	selector: "suggestion-features",
	standalone: true,
	imports: [SaMentions, SaMentionsSuggestions, SuggestionHeadless, SuggestionList],
	template: `
		<label>API layer <select [value]="layer()" (change)="layer.set($any($event.target).value)"><option value="drop-in">Drop-in</option><option value="compound">Compound</option><option value="headless">Headless</option></select></label>
		@for (example of examples; track example.id) {
			<section [attr.data-testid]="example.id"><h2>{{ example.title }}</h2><p>Type @, then scroll or use ArrowDown to explore suggestions.</p>
				@if (layer() === 'headless') {
					<suggestion-headless [triggers]="example.triggers" />
				} @else if (layer() === 'compound') {
					<sa-mentions [triggers]="example.triggers"><ng-template saMentionsSuggestions let-api><suggestion-list [api]="api" /></ng-template></sa-mentions>
				} @else {
					<sa-mentions [triggers]="example.triggers" />
				}
			</section>
		}
	`,
})
export class SuggestionFeatures {
	readonly layer = signal("drop-in");
	readonly examples = [
		{ id: "grouped-suggestions", title: "People / Teams / Channels", triggers: groupedTriggers },
		{ id: "paginated-suggestions", title: "10,000 synthetic users", triggers: paginatedTriggers },
	];
}
