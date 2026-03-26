import {
	buildMentionHTML,
	type ConnectReturn,
	connect,
	extractMentions,
	getCaretRect,
	getCursorOffset,
	getMarkupFromDOM,
	getPlainTextFromDOM,
	insertTextAtCursor,
	type MentionCallbacks,
	MentionController,
	type MentionItem,
	type MentionState,
	performMentionInsertion,
	restoreCursor,
	type TriggerConfig,
} from "@skyastrall/mentions-core";
import { getContext, setContext } from "svelte";

const MENTIONS_CTX = Symbol("MentionsContext");

export interface UseMentionsOptions {
	triggers: TriggerConfig[];
	value?: string;
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
	readonly state: MentionState;
	readonly aria: ConnectReturn;
	editorRef: HTMLDivElement | null;
	triggers: TriggerConfig[];
	singleLine?: boolean;
	handleInput: () => void;
	handleKeyDown: (e: KeyboardEvent) => void;
	handleBlur: (e: FocusEvent) => void;
	handleCompositionStart: () => void;
	handleCompositionEnd: () => void;
	handleScroll: () => void;
	buildHTML: (markup: string) => string;
	performInsertion: (item: MentionItem) => void;
	clear: () => void;
	focus: () => void;
	insertTrigger: (trigger: string) => void;
}

export interface UseMentionsReturn {
	readonly state: MentionState;
	readonly isOpen: boolean;
	readonly isLoading: boolean;
	readonly items: MentionItem[];
	readonly query: string;
	readonly highlightedIndex: number;
	readonly activeTrigger: string | null;
	readonly caretPosition: MentionState["caretPosition"];
	readonly markup: string;
	readonly plainText: string;
	readonly mentions: MentionItem[];
	readonly aria: ConnectReturn;
	editorRef: HTMLDivElement | null;
	handleInput: () => void;
	handleKeyDown: (e: KeyboardEvent) => void;
	handleBlur: (e: FocusEvent) => void;
	handleCompositionStart: () => void;
	handleCompositionEnd: () => void;
	handleScroll: () => void;
	buildHTML: (markup: string) => string;
	performInsertion: (item: MentionItem) => void;
	clear: () => void;
	focus: () => void;
	insertTrigger: (trigger: string) => void;
}

export function useMentions(options: UseMentionsOptions): UseMentionsReturn {
	const instanceId = `svelte-mentions-${Math.random().toString(36).slice(2, 9)}`;
	let editorRef: HTMLDivElement | null = $state(null);
	let isComposing = false;
	let compositionRAFId: number | null = null;

	const initialMarkup = options.value ?? options.defaultValue ?? "";

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

	let state: MentionState = $state(controller.getState());

	// Subscribe to controller state changes
	$effect(() => {
		const unsub = controller.subscribe(() => {
			state = controller.getState();
		});
		return unsub;
	});

	// Sync trigger/callback changes to controller
	$effect(() => {
		controller.setOptions({
			triggers: options.triggers,
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
	});

	// Sync controlled value
	$effect(() => {
		const val = options.value;
		if (val !== undefined && val !== state.markup) {
			controller.setValue(val);
			if (editorRef) {
				const html = buildHTML(val);
				if (editorRef.innerHTML !== html) editorRef.innerHTML = html;
			}
		}
	});

	// Cleanup on destroy
	$effect(() => {
		return () => {
			if (compositionRAFId !== null) cancelAnimationFrame(compositionRAFId);
			controller.destroy();
		};
	});

	// Initial HTML render
	$effect(() => {
		if (!editorRef) return;
		const html = buildHTML(state.markup);
		if (editorRef.innerHTML !== html) editorRef.innerHTML = html;
	});

	const isOpen = $derived(state.status === "suggesting" || state.status === "navigating");
	const isLoading = $derived(state.status === "loading");
	const items = $derived(state.items);
	const query = $derived(state.query);
	const highlightedIndex = $derived(state.highlightedIndex);
	const activeTrigger = $derived(state.activeTrigger);
	const caretPosition = $derived(state.caretPosition);
	const markup = $derived(state.markup);
	const plainText = $derived(state.plainText);
	const mentions = $derived(extractMentions(state.markup, options.triggers));
	const aria = $derived(connect(state, instanceId));

	function buildHTML(markupStr: string): string {
		return buildMentionHTML(markupStr, options.triggers);
	}

	function performInsertion(item: MentionItem): void {
		const triggerConfig = options.triggers.find((t) => t.char === state.activeTrigger);
		if (!triggerConfig || !state.activeTrigger || isComposing) return;
		if (!editorRef) return;

		const result = performMentionInsertion(
			editorRef,
			item,
			state.activeTrigger,
			state.query,
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
		if (!editorRef) return;

		const cursorOffset = getCursorOffset(editorRef);
		const newPlainText = getPlainTextFromDOM(editorRef);
		const newMarkup = getMarkupFromDOM(editorRef, options.triggers);

		const caretPos = getCaretRect(editorRef);
		controller.updateCaretPosition(caretPos);
		controller.handleInputChange(newMarkup, newPlainText, cursorOffset);
	}

	function handleKeyDown(e: KeyboardEvent): void {
		const open = state.status === "suggesting" || state.status === "navigating";
		if (e.key === "Tab" && options.ghostText && !(open && state.highlightedIndex >= 0)) {
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
		if (
			state.status !== "suggesting" &&
			state.status !== "navigating" &&
			state.status !== "loading"
		)
			return;
		if (!editorRef) return;
		controller.updateCaretPosition(getCaretRect(editorRef));
	}

	function clear(): void {
		if (editorRef) editorRef.innerHTML = "";
		controller.clear();
	}

	function focus(): void {
		editorRef?.focus();
	}

	function insertTrigger(trigger: string): void {
		if (!editorRef) return;
		editorRef.focus();

		const sel = window.getSelection();
		if (!sel) return;

		if (sel.rangeCount === 0) {
			const range = document.createRange();
			range.selectNodeContents(editorRef);
			range.collapse(false);
			sel.addRange(range);
		}

		const cursorOffset = getCursorOffset(editorRef);
		const currentPlain = getPlainTextFromDOM(editorRef);
		const before = currentPlain.slice(0, cursorOffset);
		const needsSpace = before.length > 0 && !/\s$/.test(before);
		insertTextAtCursor((needsSpace ? " " : "") + trigger);
	}

	function syncEditorHTML(): void {
		if (!editorRef) return;
		const html = buildHTML(state.markup);
		if (editorRef.innerHTML !== html) {
			const cursor = getCursorOffset(editorRef);
			editorRef.innerHTML = html;
			restoreCursor(editorRef, cursor);
		}
	}

	return {
		get state() {
			return state;
		},
		get isOpen() {
			return isOpen;
		},
		get isLoading() {
			return isLoading;
		},
		get items() {
			return items;
		},
		get query() {
			return query;
		},
		get highlightedIndex() {
			return highlightedIndex;
		},
		get activeTrigger() {
			return activeTrigger;
		},
		get caretPosition() {
			return caretPosition;
		},
		get markup() {
			return markup;
		},
		get plainText() {
			return plainText;
		},
		get mentions() {
			return mentions;
		},
		get aria() {
			return aria;
		},
		get editorRef() {
			return editorRef;
		},
		set editorRef(el: HTMLDivElement | null) {
			editorRef = el;
		},
		handleInput,
		handleKeyDown,
		handleBlur,
		handleCompositionStart,
		handleCompositionEnd,
		handleScroll,
		buildHTML,
		performInsertion,
		clear,
		focus,
		insertTrigger,
	};
}

export function setMentionsContext(ctx: MentionsContext): void {
	setContext(MENTIONS_CTX, ctx);
}

export function getMentionsContext(): MentionsContext {
	const ctx = getContext<MentionsContext>(MENTIONS_CTX);
	if (!ctx) {
		throw new Error("Mentions compound components must be used within <Mentions>");
	}
	return ctx;
}
