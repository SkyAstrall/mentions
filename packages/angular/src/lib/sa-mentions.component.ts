import { isPlatformBrowser } from "@angular/common";
import {
	afterNextRender,
	ChangeDetectionStrategy,
	Component,
	computed,
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
	getMarkupFromDOM,
	getPlainTextFromDOM,
	insertTextAtCursor,
	type MentionControllerOptions,
	type MentionItem,
	performMentionInsertion,
	restoreCursor,
	type TriggerConfig,
} from "@skyastrall/mentions-core";
import { MentionsControllerBridge } from "./controller-bridge";
import { MENTIONS_CONFIG } from "./tokens";

let nextInstanceId = 0;

const SUPPORTS_PLAINTEXT_ONLY =
	typeof document !== "undefined" &&
	(() => {
		const d = document.createElement("div");
		d.contentEditable = "plaintext-only";
		return d.contentEditable === "plaintext-only";
	})();

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
	template: `
		<div data-mentions="" style="position: relative;">
			<div
				#editorEl
				data-mentions-editor=""
				[attr.contenteditable]="editableValue()"
				[attr.data-empty]="isEmpty() ? '' : null"
				[attr.data-singleline]="singleLine() ? '' : null"
				[attr.data-placeholder]="placeholder()"
				[attr.aria-multiline]="!singleLine()"
				[attr.tabindex]="disabled() || cvaDisabled() ? -1 : 0"
				[attr.role]="aria().inputProps.role"
				[attr.aria-expanded]="aria().inputProps['aria-expanded']"
				[attr.aria-controls]="aria().inputProps['aria-controls']"
				[attr.aria-autocomplete]="aria().inputProps['aria-autocomplete']"
				[attr.aria-activedescendant]="aria().inputProps['aria-activedescendant']"
				[attr.aria-haspopup]="aria().inputProps['aria-haspopup']"
				data-gramm="false"
				data-gramm_editor="false"
				data-enable-grammarly="false"
				(input)="onInput()"
				(keydown)="onKeyDown($event)"
				(compositionstart)="onCompositionStart()"
				(compositionend)="onCompositionEnd()"
				(blur)="onBlur($event)"
				(paste)="onPaste($event)"
				(drop)="onDrop($event)"
			></div>
			@if (aria().isOpen || aria().isLoading) {
				<div
					role="presentation"
					data-mentions-portal=""
					data-mentions=""
					(mousedown)="$event.preventDefault()"
					[style.position]="'fixed'"
					[style.top.px]="portalTop()"
					[style.left.px]="portalLeft()"
					[style.z-index]="9999"
				>
					<ul
						[attr.id]="aria().listProps.id"
						role="listbox"
						aria-label="Suggestions"
						[attr.aria-busy]="aria().listProps['aria-busy']"
						class="sa-mentions-list"
					>
						@if (aria().isLoading) {
							<li class="sa-mentions-empty">Loading...</li>
						} @else if (aria().items.length === 0) {
							<li class="sa-mentions-empty">No results</li>
						} @else {
							@for (item of aria().items; track item.id; let i = $index) {
								<li
									[attr.id]="aria().getItemProps(i).id"
									role="option"
									[attr.aria-selected]="aria().getItemProps(i)['aria-selected']"
									class="sa-mentions-item"
									[class.sa-mentions-item--active]="i === aria().highlightedIndex"
									(pointerdown)="$event.preventDefault()"
									(click)="selectAt(i)"
								>{{ item.label }}</li>
							}
						}
					</ul>
				</div>
			}
		</div>
	`,
	styles: [
		`
			:host { display: block; }
			[data-mentions-editor] {
				outline: none;
				min-height: 1.5em;
				white-space: pre-wrap;
				overflow-wrap: break-word;
			}
			[data-mentions-editor][data-singleline] {
				white-space: nowrap;
				overflow: hidden;
				overflow-x: auto;
				min-height: 0;
			}
			[data-mentions-editor][data-singleline] br { display: none; }
			[data-mentions-editor][data-empty]::before {
				content: attr(data-placeholder);
				color: var(--mention-placeholder, var(--color-text-dim, #9ca3af));
				pointer-events: none;
				float: left;
				height: 0;
			}
			.sa-mentions-list {
				list-style: none;
				margin: 0;
				padding: 4px 0;
				max-height: var(--dropdown-max-height, 240px);
				overflow-y: auto;
				background: var(--dropdown-bg, white);
				border: var(--dropdown-border, 1px solid #e2e8f0);
				border-radius: var(--dropdown-radius, 8px);
				box-shadow: var(--dropdown-shadow, 0 4px 12px rgba(0, 0, 0, 0.08));
				min-width: 200px;
			}
			.sa-mentions-item {
				padding: var(--item-padding, 8px 12px);
				cursor: pointer;
			}
			.sa-mentions-item--active {
				background: var(--item-active-bg, #f1f5f9);
			}
			.sa-mentions-empty {
				padding: var(--item-padding, 8px 12px);
				color: #94a3b8;
				font-size: 0.875rem;
				list-style: none;
			}
		`,
	],
})
export class SaMentions implements ControlValueAccessor {
	readonly triggers = input.required<TriggerConfig[]>();
	readonly singleLine = input(false);
	readonly placeholder = input("");
	readonly disabled = input(false);
	readonly autoFocus = input(false);
	readonly value = model("");

	readonly mentionInsert = output<{ item: MentionItem; trigger: string }>();
	readonly mentionRemove = output<{ item: MentionItem; trigger: string }>();
	readonly opened = output<string>();
	readonly closed = output<void>();

	private readonly editorEl = viewChild.required<ElementRef<HTMLDivElement>>("editorEl");
	private readonly destroyRef = inject(DestroyRef);
	private readonly platformId = inject(PLATFORM_ID);
	private readonly globalConfig = inject(MENTIONS_CONFIG, { optional: true }) ?? {};
	private readonly instanceId = `sa${++nextInstanceId}`;

	private bridgeRef?: MentionsControllerBridge;
	private isComposing = false;
	private cvaOnChange: (markup: string) => void = () => {};
	private cvaOnTouched: () => void = () => {};
	protected readonly cvaDisabled = signal(false);

	protected readonly aria: Signal<ConnectReturn> = computed(() =>
		connect(this.bridge.state(), this.instanceId),
	);
	protected readonly isEmpty: Signal<boolean> = computed(() => !this.bridge.state().markup);
	protected readonly editableValue: Signal<"plaintext-only" | "true" | "false"> = computed(() => {
		if (this.disabled() || this.cvaDisabled()) return "false";
		return SUPPORTS_PLAINTEXT_ONLY ? "plaintext-only" : "true";
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
			const el = this.editorEl().nativeElement;
			const html = buildMentionHTML(markup, this.triggers());
			if (el.innerHTML !== html) {
				const cursor = getCursorOffset(el);
				el.innerHTML = html;
				restoreCursor(el, cursor);
			}
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
		const plainText = getPlainTextFromDOM(el);
		const markup = getMarkupFromDOM(el, this.triggers());
		this.bridge.controller.updateCaretPosition(getCaretRect(el));
		this.bridge.controller.handleInputChange(markup, plainText, cursor);
	}

	protected onKeyDown(e: KeyboardEvent): void {
		const result = this.bridge.controller.handleKeyDown(e.key);
		if (result.handled) {
			e.preventDefault();
			if ("action" in result && result.action === "select") {
				this.performInsertion(result.item);
			}
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
		if (this.singleLine()) {
			e.preventDefault();
			const text = e.clipboardData?.getData("text/plain").replace(/[\n\r]/g, " ") ?? "";
			insertTextAtCursor(text);
			return;
		}
		if (!SUPPORTS_PLAINTEXT_ONLY) {
			e.preventDefault();
			const text = e.clipboardData?.getData("text/plain") ?? "";
			insertTextAtCursor(text);
		}
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
		this.bridge.controller.handleInsertComplete(
			result.markup,
			result.plainText,
			result.cursor,
			item,
		);
	}
}
