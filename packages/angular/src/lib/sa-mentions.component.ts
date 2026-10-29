import { isPlatformBrowser, NgTemplateOutlet } from "@angular/common";
import {
	afterNextRender,
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	computed,
	contentChild,
	DestroyRef,
	type ElementRef,
	effect,
	forwardRef,
	inject,
	input,
	model,
	output,
	PLATFORM_ID,
	type Provider,
	type Signal,
	signal,
	viewChild,
} from "@angular/core";
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from "@angular/forms";
import {
	buildMentionHTML,
	type ConnectReturn,
	connect,
	getCaretRect,
	getCursorOffset,
	getPlainTextFromDOM,
	handleEditorPaste,
	insertLargeText,
	insertTextAtCursor,
	isLargePaste,
	type MentionControllerOptions,
	type MentionItem,
	performMentionInsertion,
	readEditorState,
	restoreCursor,
	supportsPlaintextOnly,
	type TriggerConfig,
	updateCaretIfActive,
} from "@skyastrall/mentions-core";
import { MentionsControllerBridge } from "./controller-bridge";
import { editorStyles } from "./editor-styles";
import { type MentionsSuggestionsContext, SaMentionsSuggestions } from "./suggestions-template";
import { MENTIONS_CONFIG } from "./tokens";

let nextInstanceId = 0;

export const SA_MENTIONS_VALUE_ACCESSOR: Provider = {
	provide: NG_VALUE_ACCESSOR,
	useExisting: forwardRef(() => SaMentions),
	multi: true,
};

@Component({
	selector: "sa-mentions",
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [SA_MENTIONS_VALUE_ACCESSOR],
	templateUrl: "./sa-mentions.component.html",
	styles: [editorStyles],
	imports: [NgTemplateOutlet],
})
export class SaMentions implements ControlValueAccessor {
	readonly suggestionsTemplate = contentChild(SaMentionsSuggestions);
	readonly suggestionsContext = computed<MentionsSuggestionsContext>(() => ({
		...this.aria(),
		selectAt: (index) => this.selectAt(index),
		loadMore: () => {
			this.bridge.controller.loadMore();
			this.renderSuggestions();
		},
		handleListScroll: (geometry) => {
			this.bridge.controller.handleListScroll(geometry);
			this.renderSuggestions();
		},
	}));
	readonly triggers = input.required<TriggerConfig[]>();
	readonly singleLine = input(false);
	readonly placeholder = input("");
	readonly disabled = input(false);
	readonly readOnly = input(false);
	readonly autoFocus = input(false);
	readonly ghostText = input("");
	readonly value = model("");

	readonly mentionInsert = output<{ item: MentionItem; trigger: string }>();
	readonly mentionRemove = output<{ item: MentionItem; trigger: string }>();
	readonly opened = output<string>();
	readonly closed = output<void>();
	readonly acceptGhostText = output<void>();

	private readonly editorEl = viewChild.required<ElementRef<HTMLDivElement>>("editorEl");
	private readonly destroyRef = inject(DestroyRef);
	private readonly changeDetector = inject(ChangeDetectorRef);
	private readonly platformId = inject(PLATFORM_ID);
	private readonly globalConfig = inject(MENTIONS_CONFIG, { optional: true }) ?? {};
	private readonly instanceId = `sa${++nextInstanceId}`;

	private bridgeRef?: MentionsControllerBridge;
	private isComposing = false;
	/**
	 * Markup last read from the editor DOM. When state.markup matches it, the
	 * change originated from user input and the DOM is already correct — the
	 * render effect must not rebuild (and serialize) the whole editor per keystroke.
	 */
	private lastDomMarkup = "";
	private cvaOnChange: (markup: string) => void = () => {};
	private cvaOnTouched: () => void = () => {};
	protected readonly cvaDisabled = signal(false);

	protected readonly aria: Signal<ConnectReturn> = computed(() =>
		connect(this.bridge.state(), this.instanceId),
	);
	protected readonly isEmpty: Signal<boolean> = computed(() => !this.bridge.state().markup);
	protected readonly editableValue: Signal<"plaintext-only" | "true" | "false"> = computed(() => {
		if (this.disabled() || this.cvaDisabled() || this.readOnly()) return "false";
		return supportsPlaintextOnly() ? "plaintext-only" : "true";
	});
	protected readonly portalTop: Signal<number> = computed(() => {
		const c = this.bridge.state().caretPosition;
		return c ? c.top + c.height + 4 : 0;
	});
	protected readonly portalLeft: Signal<number> = computed(() => {
		const c = this.bridge.state().caretPosition;
		return c ? c.left : 0;
	});

	private get bridge(): MentionsControllerBridge {
		if (this.bridgeRef) return this.bridgeRef;
		const options: MentionControllerOptions = {
			triggers: this.triggers(),
			initialMarkup: this.value(),
			filterFn: this.globalConfig.filterFn,
			callbacks: {
				onChange: (markup) => {
					this.cvaOnChange(markup);
					if (this.value() !== markup) this.value.set(markup);
				},
				onSelect: (item, trigger) => this.mentionInsert.emit({ item, trigger }),
				onRemove: (item, trigger) => this.mentionRemove.emit({ item, trigger }),
				onOpen: (trigger) => this.opened.emit(trigger),
				onClose: () => this.closed.emit(),
				onError: this.globalConfig.onError,
			},
		};
		this.bridgeRef = new MentionsControllerBridge(options, this.destroyRef);
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

	constructor() {
		effect(() => {
			this.bridge.controller.setOptions({ triggers: this.triggers() });
		});

		effect(() => {
			const v = this.value();
			if (v !== this.bridge.controller.getState().markup) {
				this.bridge.controller.setValue(v);
			}
		});

		if (!isPlatformBrowser(this.platformId)) return;

		effect(() => {
			const markup = this.bridge.state().markup;
			if (markup === this.lastDomMarkup) return;
			const el = this.editorEl().nativeElement;
			const html = buildMentionHTML(markup, this.triggers());
			if (el.innerHTML !== html) {
				const cursor = getCursorOffset(el);
				el.innerHTML = html;
				restoreCursor(el, cursor);
			}
			this.lastDomMarkup = markup;
		});

		afterNextRender(() => {
			if (this.autoFocus()) this.editorEl().nativeElement.focus();

			const onScroll = () => {
				const s = this.bridge.controller.getState();
				const open =
					s.status === "suggesting" || s.status === "navigating" || s.status === "loading";
				if (!open) return;
				this.bridge.controller.updateCaretPosition(getCaretRect(this.editorEl().nativeElement));
			};
			window.addEventListener("scroll", onScroll, true);
			this.destroyRef.onDestroy(() => window.removeEventListener("scroll", onScroll, true));
		});
	}

	private renderSuggestions(): void {
		this.changeDetector.detectChanges();
		const id = this.aria().inputProps["aria-activedescendant"];
		if (id) {
			this.editorEl().nativeElement.ownerDocument.getElementById(id)?.scrollIntoView({
				block: "nearest",
				inline: "nearest",
			});
		}
	}

	writeValue(v: string | null): void {
		this.bridge.controller.setValue(v ?? "");
	}

	registerOnChange(fn: (markup: string) => void): void {
		this.cvaOnChange = fn;
	}

	registerOnTouched(fn: () => void): void {
		this.cvaOnTouched = fn;
	}

	setDisabledState(d: boolean): void {
		this.cvaDisabled.set(d);
	}

	focus(): void {
		this.editorEl().nativeElement.focus();
	}

	clear(): void {
		this.editorEl().nativeElement.innerHTML = "";
		this.lastDomMarkup = "";
		this.bridge.controller.clear();
	}

	getValue(): { markup: string; plainText: string } {
		const s = this.bridge.controller.getState();
		return { markup: s.markup, plainText: s.plainText };
	}

	insertTrigger(trigger: string): void {
		const el = this.editorEl().nativeElement;
		el.focus();
		const sel = window.getSelection();
		if (!sel) return;
		if (sel.rangeCount === 0) {
			const range = document.createRange();
			range.selectNodeContents(el);
			range.collapse(false);
			sel.addRange(range);
		}
		const cursor = getCursorOffset(el);
		const before = getPlainTextFromDOM(el).slice(0, cursor);
		const needsSpace = before.length > 0 && !/\s$/.test(before);
		insertTextAtCursor((needsSpace ? " " : "") + trigger);
	}

	insertText(text: string): void {
		const el = this.editorEl().nativeElement;
		el.focus();
		const sel = window.getSelection();
		if (sel && sel.rangeCount === 0) {
			const range = document.createRange();
			range.selectNodeContents(el);
			range.collapse(false);
			sel.addRange(range);
		}
		// Both branches fire an input event, so the pipeline runs once.
		if (isLargePaste(text)) {
			insertLargeText(el, text);
		} else {
			insertTextAtCursor(text);
		}
	}

	protected onInput(): void {
		if (this.isComposing) return;
		const el = this.editorEl().nativeElement;

		if (this.singleLine()) {
			for (const br of Array.from(el.querySelectorAll("br"))) {
				br.replaceWith(document.createTextNode(" "));
			}
			for (const div of Array.from(el.querySelectorAll("div:not([data-mention])"))) {
				const parent = div.parentNode;
				if (!parent) continue;
				parent.insertBefore(document.createTextNode(" "), div);
				while (div.firstChild) parent.insertBefore(div.firstChild, div);
				parent.removeChild(div);
			}
		}

		const cursor = getCursorOffset(el);
		const { markup, plainText } = readEditorState(el, this.triggers());
		this.lastDomMarkup = markup;
		this.bridge.controller.handleInputChange(markup, plainText, cursor);
		updateCaretIfActive(this.bridge.controller, el);
	}

	protected onKeyDown(e: KeyboardEvent): void {
		const s = this.bridge.controller.getState();
		const open = s.status === "suggesting" || s.status === "navigating";
		if (e.key === "Tab" && this.ghostText() && !(open && s.highlightedIndex >= 0)) {
			e.preventDefault();
			insertTextAtCursor(this.ghostText());
			this.acceptGhostText.emit();
			return;
		}

		const result = this.bridge.controller.handleKeyDown(e.key);
		if (result.handled) {
			e.preventDefault();
			if ("action" in result && result.action === "select") {
				this.performInsertion(result.item);
			}
			this.renderSuggestions();
			return;
		}
		if (this.singleLine() && e.key === "Enter") {
			e.preventDefault();
		}
	}

	protected onCompositionStart(): void {
		this.isComposing = true;
		this.bridge.controller.handleCompositionStart();
	}

	protected onCompositionEnd(): void {
		this.isComposing = false;
		this.bridge.controller.handleCompositionEnd();
		requestAnimationFrame(() => this.onInput());
	}

	protected onBlur(e: FocusEvent): void {
		const related = e.relatedTarget as HTMLElement | null;
		if (related) {
			const root = (e.currentTarget as HTMLElement).closest("[data-mentions]");
			if (root?.contains(related)) return;
			if (related.closest("[data-mentions-portal]")) return;
		}
		this.cvaOnTouched();
		this.bridge.controller.handleBlur();
	}

	protected onPaste(e: ClipboardEvent): void {
		handleEditorPaste(e, this.editorEl().nativeElement, {
			singleLine: this.singleLine(),
			plaintextOnly: supportsPlaintextOnly(),
		});
	}

	protected onDrop(e: DragEvent): void {
		if (!this.singleLine()) return;
		e.preventDefault();
		const text = e.dataTransfer?.getData("text/plain").replace(/[\n\r]/g, " ") ?? "";
		insertTextAtCursor(text);
	}

	protected selectAt(index: number): void {
		const item = this.bridge.controller.getState().items[index];
		if (item) this.performInsertion(item);
	}

	private performInsertion(item: MentionItem): void {
		if (this.isComposing) return;
		const s = this.bridge.controller.getState();
		const trigger = s.activeTrigger;
		if (!trigger) return;
		const cfg = this.triggers().find((t) => t.char === trigger);
		if (!cfg) return;
		const el = this.editorEl().nativeElement;
		const result = performMentionInsertion(el, item, trigger, s.query, cfg, this.triggers());
		if (!result) {
			this.globalConfig.onError?.(
				new Error(`Mention insertion failed: could not insert "${item.label}"`),
			);
			return;
		}
		this.lastDomMarkup = result.markup;
		this.bridge.controller.handleInsertComplete(
			result.markup,
			result.plainText,
			result.cursor,
			item,
		);
	}
}
