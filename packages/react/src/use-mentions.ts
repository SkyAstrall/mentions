import {
	type ConnectReturn,
	MentionController,
	type MentionCallbacks,
	type MentionItem,
	type MentionState,
	type TriggerConfig,
	buildMentionHTML,
	connect,
	extractMentions,
	getCaretRect,
	getCursorOffset,
	getMarkupFromDOM,
	getPlainTextFromDOM,
	insertTextAtCursor,
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

	const callbacksRef = useRef({ onAcceptGhostText });
	callbacksRef.current = { onAcceptGhostText };

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
			el.innerHTML = html;
		}
	}, [buildHTML]);

	useEffect(() => {
		syncEditor();
	}, [syncEditor]);

	useEffect(() => {
		if (!isControlled || value === undefined) return;
		if (value === lastReportedMarkupRef.current) return;
		const el = editorRef.current;
		if (!el) return;
		el.innerHTML = buildHTML(value);
	}, [value, isControlled, buildHTML]);

	const performDOMInsertion = useCallback(
		(item: MentionItem) => {
			const activeTrigger = stateRef.current.activeTrigger;
			const query = stateRef.current.query;
			const trigs = triggersRef.current;
			const triggerConfig = trigs.find((t) => t.char === activeTrigger);

			if (!triggerConfig || !activeTrigger) return;
			if (isComposingRef.current) return;

			const el = editorRef.current;
			if (!el) return;

			const sel = window.getSelection();
			if (!sel || sel.rangeCount === 0) return;

			const range = sel.getRangeAt(0);
			let container: Node = range.startContainer;
			let offset = range.startOffset;

			if (container.nodeType === Node.ELEMENT_NODE) {
				if (offset > 0 && container.childNodes[offset - 1]?.nodeType === Node.TEXT_NODE) {
					container = container.childNodes[offset - 1];
					offset = container.textContent?.length ?? 0;
				} else if (
					offset < container.childNodes.length &&
					container.childNodes[offset]?.nodeType === Node.TEXT_NODE
				) {
					container = container.childNodes[offset];
					offset = 0;
				} else {
					return;
				}
			}

			if (container.nodeType !== Node.TEXT_NODE) return;

			const triggerQueryLen = activeTrigger.length + query.length;
			if (offset < triggerQueryLen) return;

			const startRawOffset = offset - triggerQueryLen;
			const expectedText = activeTrigger + query;
			const fullText = container.textContent ?? "";
			const actualText = fullText.slice(startRawOffset, offset);

			if (actualText !== expectedText) return;

			const parent = container.parentNode;
			if (!parent || !el.contains(parent)) return;

			const mark = document.createElement("mark");
			mark.setAttribute("data-mention", activeTrigger);
			mark.setAttribute("data-id", item.id);
			mark.contentEditable = "false";
			const bg = triggerConfig.color ?? "var(--mention-bg, oklch(0.93 0.03 250))";
			mark.style.cssText = `background-color:${bg};border-radius:var(--mention-radius, 3px);padding:0 2px`;
			mark.textContent = activeTrigger + item.label;

			const before = fullText.slice(0, startRawOffset);
			const after = fullText.slice(offset);

			const frag = document.createDocumentFragment();
			if (before) frag.appendChild(document.createTextNode(before));
			frag.appendChild(mark);

			const spacer = document.createTextNode("\u200B ");
			frag.appendChild(spacer);

			if (after) frag.appendChild(document.createTextNode(after));

			parent.replaceChild(frag, container);

			const newRange = document.createRange();
			newRange.setStart(spacer, spacer.length);
			newRange.collapse(true);
			sel.removeAllRanges();
			sel.addRange(newRange);

			const newPlainText = getPlainTextFromDOM(el);
			const newMarkup = getMarkupFromDOM(el, trigs);
			const newCursor = getCursorOffset(el);

			lastReportedMarkupRef.current = newMarkup;
			controller.handleInsertComplete(newMarkup, newPlainText, newCursor, item);
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
		if (!sel || sel.rangeCount === 0) return;

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
			if (
				e.key === "Tab" &&
				ghostTextRef.current &&
				!(isOpen && s.highlightedIndex >= 0)
			) {
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
