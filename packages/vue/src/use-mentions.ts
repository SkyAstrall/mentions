import {
	buildMentionHTML,
	type ConnectReturn,
	connect,
	extractMentions,
	getCaretRect,
	getCursorOffset,
	getPlainTextFromDOM,
	handleEditorPaste,
	insertLargeText,
	insertTextAtCursor,
	isLargePaste,
	type MentionCallbacks,
	MentionController,
	type MentionItem,
	type MentionState,
	performMentionInsertion,
	readEditorState,
	restoreCursor,
	supportsPlaintextOnly,
	type TriggerConfig,
	updateCaretIfActive,
} from "@skyastrall/mentions-core";
import {
	computed,
	type InjectionKey,
	inject,
	onScopeDispose,
	type Ref,
	type ShallowRef,
	shallowRef,
	useId,
	watch,
} from "vue";

export interface UseMentionsOptions {
	triggers: TriggerConfig[];
	modelValue?: string;
	defaultValue?: string;
	onChange?: MentionCallbacks["onChange"];
	onSelect?: MentionCallbacks["onSelect"];
	onRemove?: MentionCallbacks["onRemove"];
	onQueryChange?: MentionCallbacks["onQueryChange"];
	onOpen?: MentionCallbacks["onOpen"];
	onClose?: MentionCallbacks["onClose"];
	onError?: MentionCallbacks["onError"];
	ghostText?: string;
	onAcceptGhostText?: () => void;
}

export interface MentionsContext {
	state: Readonly<ShallowRef<MentionState>>;
	aria: Readonly<Ref<ConnectReturn>>;
	editorRef: ShallowRef<HTMLDivElement | null>;
	triggers: TriggerConfig[];
	singleLine?: boolean;
	handleInput: () => void;
	handleKeyDown: (e: KeyboardEvent) => void;
	handleBlur: (e: FocusEvent) => void;
	handleCompositionStart: () => void;
	handleCompositionEnd: () => void;
	handlePaste: (e: ClipboardEvent) => void;
	handleScroll: () => void;
	buildHTML: (markup: string) => string;
	performInsertion: (item: MentionItem) => void;
	clear: () => void;
	focus: () => void;
	insertTrigger: (trigger: string) => void;
	insertText: (text: string) => void;
}

export const MentionsKey: InjectionKey<MentionsContext> = Symbol("MentionsContext");

export function useMentionsContext(): MentionsContext {
	const ctx = inject(MentionsKey);
	if (!ctx) {
		throw new Error("Mentions compound components must be used within <Mentions>");
	}
	return ctx;
}

export interface UseMentionsReturn {
	state: Readonly<ShallowRef<MentionState>>;
	editorRef: ShallowRef<HTMLDivElement | null>;
	isOpen: Readonly<Ref<boolean>>;
	isLoading: Readonly<Ref<boolean>>;
	items: Readonly<Ref<MentionItem[]>>;
	query: Readonly<Ref<string>>;
	highlightedIndex: Readonly<Ref<number>>;
	activeTrigger: Readonly<Ref<string | null>>;
	caretPosition: Readonly<Ref<MentionState["caretPosition"]>>;
	markup: Readonly<Ref<string>>;
	plainText: Readonly<Ref<string>>;
	mentions: Readonly<Ref<MentionItem[]>>;
	aria: Readonly<Ref<ConnectReturn>>;
	handleInput: () => void;
	handleKeyDown: (e: KeyboardEvent) => void;
	handleBlur: (e: FocusEvent) => void;
	handleCompositionStart: () => void;
	handleCompositionEnd: () => void;
	handlePaste: (e: ClipboardEvent) => void;
	handleScroll: () => void;
	buildHTML: (markup: string) => string;
	performInsertion: (item: MentionItem) => void;
	clear: () => void;
	focus: () => void;
	insertTrigger: (trigger: string) => void;
	insertText: (text: string) => void;
}

export function useMentions(options: UseMentionsOptions): UseMentionsReturn {
	const instanceId = useId();
	const editorRef = shallowRef<HTMLDivElement | null>(null);
	let isComposing = false;
	let compositionRAFId: number | null = null;
	let initRAFId: number | null = null;

	const initialMarkup = options.modelValue ?? options.defaultValue ?? "";

	const controller = new MentionController({
		triggers: options.triggers,
		initialMarkup,
		callbacks: {
			onChange: options.onChange,
			onSelect: options.onSelect,
			onRemove: options.onRemove,
			onQueryChange: options.onQueryChange,
			onOpen: options.onOpen,
			onClose: options.onClose,
			onError: options.onError,
		},
	});

	const state = shallowRef(controller.getState());

	const unsubscribe = controller.subscribe(() => {
		state.value = controller.getState();
	});

	onScopeDispose(() => {
		if (compositionRAFId !== null) cancelAnimationFrame(compositionRAFId);
		if (initRAFId !== null) cancelAnimationFrame(initRAFId);
		unsubscribe();
		controller.destroy();
	});

	watch(
		() => options.triggers,
		(triggers) => {
			controller.setOptions({
				triggers,
				callbacks: {
					onChange: options.onChange,
					onSelect: options.onSelect,
					onRemove: options.onRemove,
					onQueryChange: options.onQueryChange,
					onOpen: options.onOpen,
					onClose: options.onClose,
					onError: options.onError,
				},
			});
			syncEditorHTML();
		},
		{ deep: true },
	);

	watch(
		() => options.modelValue,
		(newVal) => {
			if (newVal !== undefined && newVal !== state.value.markup) {
				controller.setValue(newVal);
				// Cursor-preserving rebuild: an external value change must not
				// teleport the caret to the start of the editor.
				syncEditorHTML();
			}
		},
	);

	const isOpen = computed(
		() => state.value.status === "suggesting" || state.value.status === "navigating",
	);
	const isLoading = computed(() => state.value.status === "loading");
	const items = computed(() => state.value.items);
	const query = computed(() => state.value.query);
	const highlightedIndex = computed(() => state.value.highlightedIndex);
	const activeTrigger = computed(() => state.value.activeTrigger);
	const caretPosition = computed(() => state.value.caretPosition);
	const markup = computed(() => state.value.markup);
	const plainText = computed(() => state.value.plainText);
	const mentions = computed(() => extractMentions(state.value.markup, options.triggers));
	const aria = computed(() => connect(state.value, instanceId));

	function buildHTML(markupStr: string): string {
		return buildMentionHTML(markupStr, options.triggers);
	}

	function performInsertion(item: MentionItem): void {
		const s = state.value;
		const triggerConfig = options.triggers.find((t) => t.char === s.activeTrigger);
		if (!triggerConfig || !s.activeTrigger || isComposing) return;

		const el = editorRef.value;
		if (!el) return;

		const result = performMentionInsertion(
			el,
			item,
			s.activeTrigger,
			s.query,
			triggerConfig,
			options.triggers,
		);
		if (!result) {
			options.onError?.(
				new Error(
					`Mention insertion failed: could not insert "${item.label}" at current cursor position`,
				),
			);
			return;
		}

		controller.handleInsertComplete(result.markup, result.plainText, result.cursor, item);
	}

	function handleInput(): void {
		if (isComposing) return;
		const el = editorRef.value;
		if (!el) return;

		const cursorOffset = getCursorOffset(el);
		const { markup: newMarkup, plainText: newPlainText } = readEditorState(el, options.triggers);

		controller.handleInputChange(newMarkup, newPlainText, cursorOffset);
		updateCaretIfActive(controller, el);
	}

	function handlePaste(e: ClipboardEvent): void {
		const el = editorRef.value;
		if (!el) return;
		handleEditorPaste(e, el, { plaintextOnly: supportsPlaintextOnly() });
	}

	function handleKeyDown(e: KeyboardEvent): void {
		const s = state.value;
		const open = s.status === "suggesting" || s.status === "navigating";
		if (e.key === "Tab" && options.ghostText && !(open && s.highlightedIndex >= 0)) {
			e.preventDefault();
			insertTextAtCursor(options.ghostText);
			options.onAcceptGhostText?.();
			return;
		}

		const result = controller.handleKeyDown(e.key);
		if (result.handled) {
			e.preventDefault();
			if ("action" in result && result.action === "select") {
				performInsertion(result.item);
			}
		}
	}

	function handleBlur(e: FocusEvent): void {
		const related = e.relatedTarget as HTMLElement | null;
		if (related) {
			const mentionsRoot = (e.currentTarget as HTMLElement)?.closest?.("[data-mentions]");
			if (mentionsRoot?.contains(related)) return;
			if (related.closest?.("[data-mentions-portal]")) return;
		}
		controller.handleBlur();
	}

	function handleCompositionStart(): void {
		isComposing = true;
		controller.handleCompositionStart();
	}

	function handleCompositionEnd(): void {
		isComposing = false;
		controller.handleCompositionEnd();
		compositionRAFId = requestAnimationFrame(() => {
			compositionRAFId = null;
			handleInput();
		});
	}

	function handleScroll(): void {
		const s = state.value;
		if (s.status !== "suggesting" && s.status !== "navigating" && s.status !== "loading") return;
		const el = editorRef.value;
		if (!el) return;
		controller.updateCaretPosition(getCaretRect(el));
	}

	function clear(): void {
		const el = editorRef.value;
		if (el) el.innerHTML = "";
		controller.clear();
	}

	function focus(): void {
		editorRef.value?.focus();
	}

	function insertTrigger(trigger: string): void {
		const el = editorRef.value;
		if (!el) return;
		el.focus();

		const sel = window.getSelection();
		if (!sel) return;

		// After focus() the browser may not have a selection range yet
		// (e.g. after blur, clear, or programmatic focus from a button click).
		if (sel.rangeCount === 0) {
			const range = document.createRange();
			range.selectNodeContents(el);
			range.collapse(false);
			sel.addRange(range);
		}

		const cursorOffset = getCursorOffset(el);
		const currentPlain = getPlainTextFromDOM(el);
		const before = currentPlain.slice(0, cursorOffset);
		const needsSpace = before.length > 0 && !/\s$/.test(before);
		insertTextAtCursor((needsSpace ? " " : "") + trigger);
	}

	function insertText(text: string): void {
		const el = editorRef.value;
		if (!el) return;
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

	function syncEditorHTML(): void {
		const el = editorRef.value;
		if (!el) return;
		const html = buildHTML(state.value.markup);
		if (el.innerHTML !== html) {
			const cursor = getCursorOffset(el);
			el.innerHTML = html;
			restoreCursor(el, cursor);
		}
	}

	if (typeof requestAnimationFrame !== "undefined") {
		initRAFId = requestAnimationFrame(() => {
			initRAFId = null;
			const el = editorRef.value;
			if (!el) return;
			const html = buildHTML(state.value.markup);
			if (el.innerHTML !== html) el.innerHTML = html;
		});
	}

	return {
		state,
		editorRef,
		isOpen,
		isLoading,
		items,
		query,
		highlightedIndex,
		activeTrigger,
		caretPosition,
		markup,
		plainText,
		mentions,
		aria,
		handleInput,
		handleKeyDown,
		handleBlur,
		handleCompositionStart,
		handleCompositionEnd,
		handlePaste,
		handleScroll,
		buildHTML,
		performInsertion,
		clear,
		focus,
		insertTrigger,
		insertText,
	};
}
