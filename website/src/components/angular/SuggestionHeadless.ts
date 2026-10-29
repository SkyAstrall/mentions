import {
	ChangeDetectorRef,
	Component,
	computed,
	DestroyRef,
	type ElementRef,
	inject,
	input,
	viewChild,
} from "@angular/core";
import { MentionsControllerBridge, type MentionsSuggestionsContext, type TriggerConfig } from "@skyastrall/mentions-angular";
import { getCursorOffset, handleEditorPaste, performMentionInsertion, readEditorState } from "@skyastrall/mentions-core";
import { SuggestionList } from "./SuggestionList";

let nextId = 0;

@Component({
	selector: "suggestion-headless",
	standalone: true,
	imports: [SuggestionList],
	template: `
		<div data-mentions="">
			<div #editor contenteditable="true" data-mentions-editor="" tabindex="0" role="combobox"
				[attr.aria-expanded]="api().inputProps['aria-expanded']" [attr.aria-controls]="api().inputProps['aria-controls']"
				[attr.aria-activedescendant]="api().inputProps['aria-activedescendant']" aria-autocomplete="list" aria-haspopup="listbox"
				(input)="onInput()" (keydown)="onKeyDown($event)" (blur)="bridge.controller.handleBlur()"
				(compositionstart)="bridge.controller.handleCompositionStart()" (compositionend)="onCompositionEnd()" (paste)="onPaste($event)"></div>
			@if (api().isOpen || api().isLoading) { <suggestion-list [api]="api()" /> }
		</div>
	`,
})
export class SuggestionHeadless {
	readonly triggers = input.required<TriggerConfig[]>();
	private readonly destroyRef = inject(DestroyRef);
	private readonly changeDetector = inject(ChangeDetectorRef);
	private readonly editor = viewChild.required<ElementRef<HTMLDivElement>>("editor");
	private readonly id = `suggestions-headless-${++nextId}`;
	private bridgeRef?: MentionsControllerBridge;
	get bridge(): MentionsControllerBridge {
		if (this.bridgeRef) return this.bridgeRef;
		this.bridgeRef = new MentionsControllerBridge({ triggers: this.triggers() }, this.destroyRef);
		const controller = this.bridgeRef.controller;
		let previousState = controller.getState();
		const unsubscribe = controller.subscribe(() => {
			const state = controller.getState();
			const suggestionsChanged =
				state.highlightedIndex !== previousState.highlightedIndex ||
				state.items !== previousState.items;
			previousState = state;
			if (suggestionsChanged) this.renderSuggestions();
		});
		this.destroyRef.onDestroy(unsubscribe);
		return this.bridgeRef;
	}
	readonly api = computed<MentionsSuggestionsContext>(() => ({
		...this.bridge.connect(this.id),
		selectAt: (index) => this.select(index),
		loadMore: () => {
			this.bridge.loadMore();
			this.renderSuggestions();
		},
		handleListScroll: (geometry) => {
			this.bridge.handleListScroll(geometry);
			this.renderSuggestions();
		},
	}));
	private renderSuggestions(): void {
		this.changeDetector.detectChanges();
		const id = this.api().inputProps["aria-activedescendant"];
		if (id) {
			this.editor().nativeElement.ownerDocument.getElementById(id)?.scrollIntoView({
				block: "nearest",
				inline: "nearest",
			});
		}
	}
	onInput(): void {
		if (this.bridge.state().isComposing) return;
		const el = this.editor().nativeElement;
		const { markup, plainText } = readEditorState(el, this.triggers());
		this.bridge.controller.handleInputChange(markup, plainText, getCursorOffset(el));
	}
	onKeyDown(event: KeyboardEvent): void {
		if (event.isComposing) return;
		const result = this.bridge.controller.handleKeyDown(event.key);
		if (result.handled) {
			event.preventDefault();
			if ("item" in result) this.select(this.api().items.indexOf(result.item));
			this.renderSuggestions();
		}
	}
	onCompositionEnd(): void { this.bridge.controller.handleCompositionEnd(); this.onInput(); }
	onPaste(event: ClipboardEvent): void { handleEditorPaste(event, this.editor().nativeElement, { plaintextOnly: false }); }
	select(index: number): void {
		const state = this.bridge.state();
		const trigger = this.triggers().find((trigger) => trigger.char === state.activeTrigger);
		const item = state.items[index];
		if (!item || !trigger) return;
		const result = performMentionInsertion(this.editor().nativeElement, item, trigger.char, state.query, trigger, this.triggers());
		if (!result) throw new Error("Could not insert selected suggestion");
		this.bridge.controller.handleInsertComplete(result.markup, result.plainText, result.cursor, item);
	}
}
