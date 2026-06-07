import { bootstrapApplication } from "@angular/platform-browser";
import { Component, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import {
	extractMentions,
	markupToPlainText,
	SaMentions,
	type TriggerConfig,
} from "@skyastrall/mentions-angular";

@Component({
	selector: "smoke-root",
	standalone: true,
	imports: [SaMentions, FormsModule],
	template: `
		<sa-mentions
			[triggers]="triggers"
			[ngModel]="markup()"
			(ngModelChange)="markup.set($event)"
			placeholder="smoke"
			(mentionInsert)="onInsert()"
		/>
		<p>{{ plain }}</p>
	`,
})
export class SmokeRoot {
	readonly triggers: TriggerConfig[] = [
		{ char: "@", data: [{ id: "1", label: "Alice" }] },
	];
	readonly markup = signal("hello @[Alice](1)");

	get plain(): string {
		return markupToPlainText(this.markup(), this.triggers);
	}

	onInsert(): void {
		console.log(extractMentions(this.markup(), this.triggers));
	}
}

bootstrapApplication(SmokeRoot).catch((err) => console.error(err));
