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
import {
	type RefObject,
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useSyncExternalStore,
} from "react";

export type UseMentionsOptions = {
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
};

export type UseMentionsReturn = ConnectReturn & {
	state: MentionState;
	editorRef: RefObject<HTMLDivElement | null>;
	markup: string;
	plainText: string;
	mentions: MentionItem[];
	clear: () => void;
	focus: () => void;
	insertTrigger: (trigger: string) => void;
	ghostText?: string;
	/** @internal */
	_buildHTML: (markup: string) => string;
	/** Wire to `onInput` on your contenteditable div when using the headless hook. */
	handleInput: () => void;
	inputProps: ConnectReturn["inputProps"] & {
		onKeyDown: React.KeyboardEventHandler<HTMLDivElement>;
		onCompositionStart: React.CompositionEventHandler<HTMLDivElement>;
		onCompositionEnd: React.CompositionEventHandler<HTMLDivElement>;
		onBlur: React.FocusEventHandler<HTMLDivElement>;
	};
	getItemProps: (index: number) => ReturnType<ConnectReturn["getItemProps"]> & {
		onPointerDown: React.PointerEventHandler;
		onClick: React.MouseEventHandler;
	};
};

export function useMentions(options: UseMentionsOptions): UseMentionsReturn {
	const {
		triggers,
		value,
		defaultValue = "",
		onChange,
		onSelect,
		onRemove,
		onQueryChange,
		onOpen,
		onClose,
		onError,
		ghostText,
		onAcceptGhostText,
	} = options;

	const instanceId = useId();
	const editorRef = useRef<HTMLDivElement | null>(null);
	const isComposingRef = useRef(false);
	const lastReportedMarkupRef = useRef("");
	const isControlled = value !== undefined;
	const initialMarkup = isControlled ? value : defaultValue;

	const triggersRef = useRef(triggers);
	triggersRef.current = triggers;

	const ghostTextRef = useRef(ghostText);
	ghostTextRef.current = ghostText;

	const callbacksRef = useRef({ onAcceptGhostText, onError });
	callbacksRef.current = { onAcceptGhostText, onError };

	const controllerRef = useRef<MentionController | null>(null);
	if (!controllerRef.current) {
		controllerRef.current = new MentionController({
			triggers,
			initialMarkup,
			callbacks: { onChange, onSelect, onRemove, onQueryChange, onOpen, onClose, onError },
		});
	}
	const controller = controllerRef.current;

	controller.setOptions({
		triggers,
		callbacks: { onChange, onSelect, onRemove, onQueryChange, onOpen, onClose, onError },
	});

	const subscribe = useCallback(
		(onStoreChange: () => void) => controller.subscribe(onStoreChange),
		[controller],
	);
	const getSnapshot = useCallback(() => controller.getState(), [controller]);
	const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

	const stateRef = useRef(state);
	stateRef.current = state;

	const prevValueRef = useRef(value);
	useEffect(() => {
		if (!isControlled || value === prevValueRef.current || value === state.markup) return;
		prevValueRef.current = value;
		controller.setValue(value);
	}, [value, isControlled, controller, state.markup]);

	const buildHTML = useCallback((markup: string): string => {
		return buildMentionHTML(markup, triggersRef.current);
	}, []);

	const syncEditor = useCallback(() => {
		const el = editorRef.current;
		if (!el) return;
		const html = buildHTML(stateRef.current.markup);
		if (el.innerHTML !== html) {
			const cursor = getCursorOffset(el);
			el.innerHTML = html;
			restoreCursor(el, cursor);
		}
	}, [buildHTML]);

	useEffect(() => {
		syncEditor();
	}, [syncEditor]);

	// Re-sync editor HTML when triggers change (e.g., color picker)
	const prevTriggersRef = useRef(triggers);
	useEffect(() => {
		if (prevTriggersRef.current !== triggers) {
			prevTriggersRef.current = triggers;
			syncEditor();
		}
	}, [triggers, syncEditor]);

	// Update caret position on scroll when dropdown is open
	useEffect(() => {
		const handleScroll = () => {
			const s = stateRef.current;
			if (s.status !== "suggesting" && s.status !== "navigating" && s.status !== "loading") return;
			const el = editorRef.current;
			if (!el) return;
			controller.updateCaretPosition(getCaretRect(el));
		};
		window.addEventListener("scroll", handleScroll, true);
		return () => window.removeEventListener("scroll", handleScroll, true);
	}, [controller]);

	useEffect(() => {
		if (!isControlled || value === undefined) return;
		if (value === lastReportedMarkupRef.current) return;
		const el = editorRef.current;
		if (!el) return;
		el.innerHTML = buildHTML(value);
	}, [value, isControlled, buildHTML]);

	const performDOMInsertion = useCallback(
		(item: MentionItem) => {
			const { activeTrigger, query } = stateRef.current;
			const trigs = triggersRef.current;
			const triggerConfig = trigs.find((t) => t.char === activeTrigger);

			if (!triggerConfig || !activeTrigger) return;
			if (isComposingRef.current) return;

			const el = editorRef.current;
			if (!el) return;

			const result = performMentionInsertion(el, item, activeTrigger, query, triggerConfig, trigs);
			if (!result) {
				callbacksRef.current.onError?.(
					new Error(
						`Mention insertion failed: could not insert "${item.label}" at current cursor position`,
					),
				);
				return;
			}

			lastReportedMarkupRef.current = result.markup;
			controller.handleInsertComplete(result.markup, result.plainText, result.cursor, item);
		},
		[controller],
	);

	const handleInput = useCallback(() => {
		if (isComposingRef.current) return;
		const el = editorRef.current;
		if (!el) return;

		const cursorOffset = getCursorOffset(el);
		const newPlainText = getPlainTextFromDOM(el);
		const newMarkup = getMarkupFromDOM(el, triggersRef.current);

		lastReportedMarkupRef.current = newMarkup;

		const caretPos = getCaretRect(el);
		controller.updateCaretPosition(caretPos);
		controller.handleInputChange(newMarkup, newPlainText, cursorOffset);
	}, [controller]);

	const clear = useCallback(() => {
		if (editorRef.current) {
			editorRef.current.innerHTML = "";
		}
		lastReportedMarkupRef.current = "";
		controller.clear();
	}, [controller]);

	const focus = useCallback(() => {
		editorRef.current?.focus();
	}, []);

	const insertTrigger = useCallback((trigger: string) => {
		const el = editorRef.current;
		if (!el) return;
		el.focus();

		const sel = window.getSelection();
		if (!sel) return;

		// After focus(), the browser may not have a selection range yet
		// (e.g., after blur, clear, or programmatic focus from a button click).
		// Create a collapsed range at the end of the element content.
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
		const insert = (needsSpace ? " " : "") + trigger;

		insertTextAtCursor(insert);
	}, []);

	const aria = connect(state, instanceId);

	const onKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLDivElement>) => {
			const s = stateRef.current;
			const isOpen = s.status === "suggesting" || s.status === "navigating";
			if (e.key === "Tab" && ghostTextRef.current && !(isOpen && s.highlightedIndex >= 0)) {
				e.preventDefault();
				const el = editorRef.current;
				if (!el) return;
				insertTextAtCursor(ghostTextRef.current);
				callbacksRef.current.onAcceptGhostText?.();
				return;
			}

			const result = controller.handleKeyDown(e.key);
			if (result.handled) {
				e.preventDefault();
				if ("action" in result && result.action === "select") {
					performDOMInsertion(result.item);
				}
			}
		},
		[controller, performDOMInsertion],
	);

	const onCompositionStart = useCallback(() => {
		isComposingRef.current = true;
		controller.handleCompositionStart();
	}, [controller]);

	const onCompositionEnd = useCallback(() => {
		isComposingRef.current = false;
		controller.handleCompositionEnd();
	}, [controller]);

	const onBlur = useCallback(
		(e: React.FocusEvent<HTMLDivElement>) => {
			const related = e.relatedTarget as HTMLElement | null;
			if (related) {
				const mentionsRoot = (e.currentTarget as HTMLElement)?.closest?.("[data-mentions]");
				if (mentionsRoot?.contains(related)) return;
				if (related.closest?.("[data-mentions-portal]")) return;
			}
			controller.handleBlur();
		},
		[controller],
	);

	const getItemProps = useCallback(
		(index: number) => {
			const ariaItemProps = aria.getItemProps(index);
			return {
				...ariaItemProps,
				onPointerDown: (e: React.PointerEvent) => {
					e.preventDefault();
				},
				onClick: () => {
					const item = stateRef.current.items[index];
					if (item) performDOMInsertion(item);
				},
			};
		},
		[aria.getItemProps, performDOMInsertion],
	);

	const mentions = useMemo(
		() => extractMentions(state.markup, triggersRef.current),
		[state.markup],
	);

	useEffect(() => {
		return () => {
			controller.destroy();
		};
	}, [controller]);

	return {
		inputProps: {
			...aria.inputProps,
			onKeyDown,
			onCompositionStart,
			onCompositionEnd,
			onBlur,
		},
		listProps: aria.listProps,
		getItemProps,
		isOpen: aria.isOpen,
		query: aria.query,
		items: aria.items,
		highlightedIndex: aria.highlightedIndex,
		activeTrigger: aria.activeTrigger,
		caretPosition: aria.caretPosition,
		isLoading: aria.isLoading,
		state,
		editorRef,
		markup: state.markup,
		plainText: state.plainText,
		mentions,
		clear,
		focus,
		insertTrigger,
		ghostText,
		_buildHTML: buildHTML,
		handleInput,
	};
}
