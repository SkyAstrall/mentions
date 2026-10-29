import { Component, input } from "@angular/core";
import type { MentionsSuggestionsContext } from "@skyastrall/mentions-angular";

@Component({
	selector: "suggestion-list",
	standalone: true,
	template: `
		<div [attr.id]="api().listProps.id" role="listbox" aria-label="Suggestions"
			[attr.aria-busy]="api().listProps['aria-busy']" (scroll)="api().handleListScroll($any($event.target))"
			style="max-height:240px;overflow-y:auto;background:white;color:#111;min-width:200px">
			@if (api().groups.length) {
				@for (group of api().groups; track group.id; let gi = $index) {
					<div [attr.role]="api().getGroupProps(gi).role" [attr.aria-labelledby]="api().getGroupProps(gi)['aria-labelledby']">
						@if (group.id !== null) { <div [attr.id]="api().getGroupLabelProps(gi).id">{{ group.label }}</div> }
						@for (item of group.items; track item.id; let offset = $index) {
							<div role="option" [attr.id]="api().getItemProps(group.startIndex + offset).id"
								[attr.aria-selected]="api().getItemProps(group.startIndex + offset)['aria-selected']"
								(pointerdown)="$event.preventDefault()" (click)="api().selectAt(group.startIndex + offset)"
								style="padding:12px;min-height:44px">{{ item.label }}</div>
						}
					</div>
				}
			} @else {
				@for (item of api().items; track item.id; let i = $index) {
					<div role="option" [attr.id]="api().getItemProps(i).id" [attr.aria-selected]="api().getItemProps(i)['aria-selected']"
						(pointerdown)="$event.preventDefault()" (click)="api().selectAt(i)">{{ item.label }}</div>
				}
			}
			@if (api().isLoading || api().isLoadingMore) { <div role="status">Loading...</div> }
		</div>
	`,
})
export class SuggestionList {
	readonly api = input.required<MentionsSuggestionsContext>();
}
