import type { MentionItem, TriggerConfig } from "@skyastrall/mentions-core";
import {
	type CSSProperties,
	defineComponent,
	h,
	onMounted,
	onScopeDispose,
	type PropType,
	provide,
	ref,
	Teleport,
	watch,
} from "vue";
import {
	MentionsKey,
	type UseMentionsOptions,
	useMentions,
	useMentionsContext,
} from "./use-mentions.ts";

const SUPPORTS_PLAINTEXT_ONLY =
	typeof document !== "undefined" &&
	(() => {
		const div = document.createElement("div");
		div.contentEditable = "plaintext-only";
		return div.contentEditable === "plaintext-only";
	})();

function injectStyles(): void {
	if (typeof document === "undefined") return;
	if (document.getElementById("mentions-editor-styles")) return;
	const style = document.createElement("style");
	style.id = "mentions-editor-styles";
	style.textContent =
		"[data-mentions-editor][data-empty]::before{content:attr(data-placeholder);color:var(--mention-placeholder,var(--color-text-dim,#9ca3af));pointer-events:none;float:left;height:0}[data-mentions-editor][data-singleline] br{display:none}";
	document.head.appendChild(style);
}

export interface MentionsInstance {
	focus: () => void;
	clear: () => void;
	getValue: () => { markup: string; plainText: string };
	insertTrigger: (trigger: string) => void;
}

export const Mentions = defineComponent({
	name: "Mentions",
	props: {
		triggers: { type: Array as PropType<TriggerConfig[]>, required: true },
		modelValue: { type: String, default: undefined },
		defaultValue: { type: String, default: "" },
		placeholder: { type: String, default: undefined },
		className: { type: String, default: undefined },
		disabled: { type: Boolean, default: false },
		readOnly: { type: Boolean, default: false },
		autoFocus: { type: Boolean, default: false },
		singleLine: { type: Boolean, default: false },
		ghostText: { type: String, default: undefined },
		renderItem: {
			type: Function as PropType<(item: MentionItem, highlighted: boolean) => unknown>,
			default: undefined,
		},
	},
	emits: [
		"update:modelValue",
		"select",
		"remove",
		"queryChange",
		"open",
		"close",
		"error",
		"acceptGhostText",
	],
	setup(props, { slots, emit, expose }) {
		const opts: UseMentionsOptions = {
			get triggers() {
				return props.triggers;
			},
			get modelValue() {
				return props.modelValue;
			},
			get defaultValue() {
				return props.defaultValue;
			},
			get ghostText() {
				return props.ghostText;
			},
			onChange: (m) => emit("update:modelValue", m),
			onSelect: (item, trigger) => emit("select", item, trigger),
			onRemove: (item, trigger) => emit("remove", item, trigger),
			onQueryChange: (q, trigger) => emit("queryChange", q, trigger),
			onOpen: (trigger) => emit("open", trigger),
			onClose: () => emit("close"),
			onError: (err) => emit("error", err),
			onAcceptGhostText: () => emit("acceptGhostText"),
		};

		const api = useMentions(opts);

		provide(MentionsKey, {
			state: api.state,
			aria: api.aria,
			editorRef: api.editorRef,
			get triggers() {
				return props.triggers;
			},
			singleLine: props.singleLine,
			handleInput: api.handleInput,
			handleKeyDown: api.handleKeyDown,
			handleBlur: api.handleBlur,
			handleCompositionStart: api.handleCompositionStart,
			handleCompositionEnd: api.handleCompositionEnd,
			handleScroll: api.handleScroll,
			buildHTML: api.buildHTML,
			performInsertion: api.performInsertion,
			clear: api.clear,
			focus: api.focus,
			insertTrigger: api.insertTrigger,
		});

		expose({
			focus: api.focus,
			clear: api.clear,
			getValue: () => ({ markup: api.markup.value, plainText: api.plainText.value }),
			insertTrigger: api.insertTrigger,
		} satisfies MentionsInstance);

		return () => {
			if (slots.default) {
				return h("div", { "data-mentions": "", style: { position: "relative" } }, slots.default());
			}

			const children: unknown[] = [
				h(MentionsEditor, {
					class: props.className,
					placeholder: props.placeholder,
					disabled: props.disabled,
					readOnly: props.readOnly,
					autoFocus: props.autoFocus,
					singleLine: props.singleLine,
				}),
			];

			if (api.isOpen.value || api.isLoading.value) {
				const listChildren = api.isLoading.value
					? [h(MentionsLoading, null, { default: () => "Loading..." })]
					: api.items.value.length === 0
						? [h(MentionsEmpty, null, { default: () => "No results" })]
						: api.items.value.map((item, i) =>
								h(
									MentionsItem,
									{ key: item.id, index: i },
									{
										default: () =>
											props.renderItem
												? props.renderItem(item, i === api.highlightedIndex.value)
												: item.label,
									},
								),
							);

				children.push(
					h(MentionsPortal, null, {
						default: () => h(MentionsList, null, { default: () => listChildren }),
					}),
				);
			}

			return h("div", { "data-mentions": "", style: { position: "relative" } }, children);
		};
	},
});

export const MentionsEditor = defineComponent({
	name: "MentionsEditor",
	props: {
		placeholder: { type: String, default: undefined },
		class: { type: String, default: undefined },
		disabled: { type: Boolean, default: false },
		readOnly: { type: Boolean, default: false },
		autoFocus: { type: Boolean, default: false },
		singleLine: { type: Boolean, default: undefined },
	},
	setup(props) {
		const ctx = useMentionsContext();
		const getSingleLine = () => props.singleLine ?? ctx.singleLine;

		let beforeInputHandler: ((e: Event) => void) | null = null;
		let scrollHandler: (() => void) | null = null;

		function attachSingleLineGuard(el: HTMLElement) {
			if (beforeInputHandler) el.removeEventListener("beforeinput", beforeInputHandler);
			beforeInputHandler = (e: Event) => {
				const ie = e as InputEvent;
				if (ie.inputType === "insertParagraph" || ie.inputType === "insertLineBreak") {
					e.preventDefault();
				}
			};
			el.addEventListener("beforeinput", beforeInputHandler);
		}

		function detachSingleLineGuard(el: HTMLElement) {
			if (beforeInputHandler) {
				el.removeEventListener("beforeinput", beforeInputHandler);
				beforeInputHandler = null;
			}
		}

		function stripNewlines(el: HTMLElement) {
			for (const br of el.querySelectorAll("br")) {
				br.replaceWith(document.createTextNode(" "));
			}
			for (const div of el.querySelectorAll("div:not([data-mention])")) {
				const parent = div.parentNode;
				if (!parent) continue;
				parent.insertBefore(document.createTextNode(" "), div);
				while (div.firstChild) parent.insertBefore(div.firstChild, div);
				parent.removeChild(div);
			}
			const html = ctx.buildHTML(ctx.state.value.markup.replace(/\n/g, " "));
			if (el.innerHTML !== html) el.innerHTML = html;
			ctx.handleInput();
		}

		onMounted(() => {
			injectStyles();
			if (props.autoFocus) ctx.editorRef.value?.focus();

			const el = ctx.editorRef.value;
			if (!el) return;

			if (getSingleLine()) attachSingleLineGuard(el);

			scrollHandler = () => ctx.handleScroll();
			window.addEventListener("scroll", scrollHandler, true);

			const html = ctx.buildHTML(ctx.state.value.markup);
			if (el.innerHTML !== html) el.innerHTML = html;
		});

		watch(
			() => props.singleLine,
			(isSingle) => {
				const el = ctx.editorRef.value;
				if (!el) return;
				if (isSingle) {
					attachSingleLineGuard(el);
					stripNewlines(el);
				} else {
					detachSingleLineGuard(el);
				}
			},
		);

		onScopeDispose(() => {
			const el = ctx.editorRef.value;
			if (el && beforeInputHandler) el.removeEventListener("beforeinput", beforeInputHandler);
			if (scrollHandler) window.removeEventListener("scroll", scrollHandler, true);
		});

		const editableValue = (): string => {
			if (props.disabled || props.readOnly) return "false";
			return SUPPORTS_PLAINTEXT_ONLY ? "plaintext-only" : "true";
		};

		return () => {
			const isEmpty = !ctx.state.value.markup;
			const isSingleLine = getSingleLine();

			return h("div", {
				ref: ctx.editorRef,
				class: props.class,
				contenteditable: editableValue(),
				"data-mentions-editor": "",
				"data-placeholder": props.placeholder,
				...(isEmpty ? { "data-empty": "" } : {}),
				"data-gramm": "false",
				"data-gramm_editor": "false",
				"data-enable-grammarly": "false",
				...(isSingleLine ? { "data-singleline": "" } : {}),
				"aria-multiline": !isSingleLine,
				tabindex: props.disabled ? -1 : 0,
				...ctx.aria.value.inputProps,
				onInput: () => ctx.handleInput(),
				onKeydown: (e: KeyboardEvent) => {
					ctx.handleKeyDown(e);
					if (isSingleLine && e.key === "Enter" && !e.defaultPrevented) {
						e.preventDefault();
					}
				},
				onCompositionstart: () => ctx.handleCompositionStart(),
				onCompositionend: () => ctx.handleCompositionEnd(),
				onBlur: (e: FocusEvent) => ctx.handleBlur(e),
				onPaste: (e: ClipboardEvent) => {
					if (isSingleLine) {
						e.preventDefault();
						const text = e.clipboardData?.getData("text/plain").replace(/[\n\r]/g, " ") ?? "";
						document.execCommand("insertText", false, text);
					} else if (!SUPPORTS_PLAINTEXT_ONLY) {
						e.preventDefault();
						const text = e.clipboardData?.getData("text/plain") ?? "";
						document.execCommand("insertText", false, text);
					}
				},
				...(isSingleLine
					? {
							onDrop: (e: DragEvent) => {
								e.preventDefault();
								const text = e.dataTransfer?.getData("text/plain").replace(/[\n\r]/g, " ") ?? "";
								document.execCommand("insertText", false, text);
							},
						}
					: {}),
				style: {
					outline: "none",
					whiteSpace: isSingleLine ? "nowrap" : "pre-wrap",
					overflowWrap: isSingleLine ? undefined : "break-word",
					wordWrap: isSingleLine ? undefined : "break-word",
					minHeight: isSingleLine ? undefined : "1.5em",
					overflow: isSingleLine ? "hidden" : undefined,
					overflowX: isSingleLine ? "auto" : undefined,
				} as CSSProperties,
			});
		};
	},
});

export const MentionsPortal = defineComponent({
	name: "MentionsPortal",
	props: {
		to: { type: [String, Object] as PropType<string | HTMLElement>, default: undefined },
	},
	setup(props, { slots }) {
		const ctx = useMentionsContext();

		return () => {
			if (!ctx.aria.value.isOpen && !ctx.aria.value.isLoading) return null;

			const dropdownStyle: CSSProperties = {
				position: "fixed",
				zIndex: 9999,
			};

			const cp = ctx.state.value.caretPosition;
			if (cp) {
				dropdownStyle.top = `${cp.top + cp.height + 4}px`;
				dropdownStyle.left = `${cp.left}px`;
			}

			const content = h(
				"div",
				{
					role: "presentation",
					style: dropdownStyle,
					"data-mentions-portal": "",
					"data-mentions": "",
					onMousedown: (e: MouseEvent) => e.preventDefault(),
				},
				slots.default?.(),
			);

			return props.to ? h(Teleport, { to: props.to }, { default: () => content }) : content;
		};
	},
});

export const MentionsList = defineComponent({
	name: "MentionsList",
	props: {
		class: { type: String, default: undefined },
	},
	setup(props, { slots }) {
		const ctx = useMentionsContext();

		return () =>
			h(
				"ul",
				{
					class: props.class,
					...ctx.aria.value.listProps,
					style: {
						listStyle: "none",
						margin: 0,
						padding: "4px 0",
						maxHeight: "var(--dropdown-max-height, 240px)",
						overflowY: "auto",
						backgroundColor: "var(--dropdown-bg, white)",
						border: "var(--dropdown-border, 1px solid #e2e8f0)",
						borderRadius: "var(--dropdown-radius, 8px)",
						boxShadow: "var(--dropdown-shadow, 0 4px 12px rgba(0,0,0,0.08))",
						minWidth: "200px",
					} as CSSProperties,
				},
				slots.default?.(),
			);
	},
});

export const MentionsItem = defineComponent({
	name: "MentionsItem",
	props: {
		index: { type: Number, required: true },
		class: { type: String, default: undefined },
	},
	setup(props, { slots }) {
		const ctx = useMentionsContext();
		const itemEl = ref<HTMLLIElement | null>(null);

		const highlighted = (): boolean => props.index === ctx.state.value.highlightedIndex;

		watch(
			() => ctx.state.value.highlightedIndex,
			() => {
				if (highlighted() && itemEl.value) {
					itemEl.value.scrollIntoView({ block: "nearest" });
				}
			},
		);

		return () => {
			const item = ctx.state.value.items[props.index];
			if (!item) return null;

			const ariaItemProps = ctx.aria.value.getItemProps(props.index);

			return h(
				"li",
				{
					ref: itemEl,
					class: props.class,
					...ariaItemProps,
					onPointerdown: (e: PointerEvent) => e.preventDefault(),
					onClick: () => ctx.performInsertion(item),
					style: {
						padding: "var(--item-padding, 8px 12px)",
						cursor: "pointer",
						backgroundColor: highlighted() ? "var(--item-active-bg, #f1f5f9)" : "transparent",
					} as CSSProperties,
				},
				slots.default?.({ item, highlighted: highlighted() }) ?? item.label,
			);
		};
	},
});

export const MentionsEmpty = defineComponent({
	name: "MentionsEmpty",
	setup(_, { slots }) {
		const ctx = useMentionsContext();

		return () => {
			if (ctx.state.value.items.length > 0) return null;
			return h(
				"div",
				{
					style: {
						padding: "var(--item-padding, 8px 12px)",
						color: "#94a3b8",
						fontSize: "0.875rem",
					} as CSSProperties,
				},
				slots.default?.(),
			);
		};
	},
});

export const MentionsLoading = defineComponent({
	name: "MentionsLoading",
	setup(_, { slots }) {
		return () =>
			h(
				"div",
				{
					style: {
						padding: "var(--item-padding, 8px 12px)",
						color: "#94a3b8",
						fontSize: "0.875rem",
					} as CSSProperties,
				},
				slots.default?.(),
			);
	},
});
