import {
	handleEditorPaste,
	insertTextAtCursor,
	type MentionItem,
	supportsPlaintextOnly,
	type TriggerConfig,
} from "@skyastrall/mentions-core";
import {
	type CSSProperties,
	defineComponent,
	h,
	onMounted,
	onScopeDispose,
	type PropType,
	provide,
	ref,
	type VNode,
	watch,
} from "vue";
import { MentionsKey, type UseMentionsOptions, useMentions } from "./use-mentions.js";

function injectStyles(): void {
	if (typeof document === "undefined") return;
	if (document.getElementById("mentions-editor-styles")) return;
	const style = document.createElement("style");
	style.id = "mentions-editor-styles";
	style.textContent =
		"[data-mentions-editor][data-empty]::before{content:attr(data-placeholder);color:var(--mention-placeholder,var(--color-text-dim,#9ca3af));pointer-events:none;float:left;height:0}[data-mentions-editor][data-singleline] br{display:none}";
	document.head.appendChild(style);
}

import { useMentionsContext } from "./context.js";
import {
	MentionsEmpty,
	MentionsList,
	MentionsLoading,
	MentionsPortal,
	MentionsSuggestions,
} from "./suggestions.js";

export {
	MentionsEmpty,
	MentionsGroup,
	MentionsGroupLabel,
	MentionsItem,
	MentionsList,
	MentionsLoading,
	MentionsPortal,
	MentionsSuggestions,
} from "./suggestions.js";
export interface MentionsInstance {
	focus: () => void;
	clear: () => void;
	getValue: () => { markup: string; plainText: string };
	insertTrigger: (trigger: string) => void;
	insertText: (text: string) => void;
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
	emits: {
		"update:modelValue": (markup: string) => typeof markup === "string",
		select: (item: MentionItem, trigger: string) =>
			typeof item === "object" && typeof trigger === "string",
		remove: (item: MentionItem, trigger: string) =>
			typeof item === "object" && typeof trigger === "string",
		queryChange: (query: string, trigger: string) =>
			typeof query === "string" && typeof trigger === "string",
		open: (trigger: string) => typeof trigger === "string",
		close: () => true,
		error: (err: Error) => err instanceof Error,
		acceptGhostText: () => true,
	},
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
			handlePaste: api.handlePaste,
			handleScroll: api.handleScroll,
			handleListScroll: api.handleListScroll,
			loadMore: api.loadMore,
			buildHTML: api.buildHTML,
			performInsertion: api.performInsertion,
			clear: api.clear,
			focus: api.focus,
			insertTrigger: api.insertTrigger,
			insertText: api.insertText,
		});

		expose({
			focus: api.focus,
			clear: api.clear,
			getValue: () => ({ markup: api.markup.value, plainText: api.plainText.value }),
			insertTrigger: api.insertTrigger,
			insertText: api.insertText,
		} satisfies MentionsInstance);

		return () => {
			if (slots.default) {
				return h("div", { "data-mentions": "", style: { position: "relative" } }, slots.default());
			}

			const children: VNode[] = [
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
						: [h(MentionsSuggestions, { renderItem: props.renderItem })];

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

		// Detected after mount: baking the detection into server-rendered markup
		// would freeze contenteditable="true" past hydration (SSR has no DOM to probe).
		const plaintextOnly = ref(false);

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
			plaintextOnly.value = supportsPlaintextOnly();
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
			return plaintextOnly.value ? "plaintext-only" : "true";
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
					const el = ctx.editorRef.value;
					if (!el) return;
					handleEditorPaste(e, el, {
						singleLine: isSingleLine,
						plaintextOnly: supportsPlaintextOnly(),
					});
				},
				...(isSingleLine
					? {
							onDrop: (e: DragEvent) => {
								e.preventDefault();
								const text = e.dataTransfer?.getData("text/plain").replace(/[\n\r]/g, " ") ?? "";
								insertTextAtCursor(text);
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
