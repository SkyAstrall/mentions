import {
	connect,
	createInitialState,
	createMentionMarkup,
	detectTrigger,
	extractMentions,
	filterItems,
	type MentionCallbacks,
	type MentionItem,
	type MentionSegment,
	type MentionState,
	markupToPlainText,
	mentionReducer,
	parseMarkup,
	type TriggerConfig,
} from "@skyastrall/mentions-core";
import {
	type RefObject,
	useCallback,
	useEffect,
	useId,
	useMemo,
	useReducer,
	useRef,
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

export type UseMentionsReturn = ReturnType<typeof connect> & {
	state: MentionState;
	editorRef: RefObject<HTMLDivElement | null>;
	markup: string;
	plainText: string;
	mentions: MentionItem[];
	clear: () => void;
	focus: () => void;
	insertTrigger: (trigger: string) => void;
	ghostText?: string;
	buildHTML: (markup: string) => string;
	syncEditor: () => void;
	handleInput: () => void;
};

function escapeHTML(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function isExtensionNode(node: Node): boolean {
	if (node.nodeType !== Node.ELEMENT_NODE) return false;
	const el = node as HTMLElement;
	const tag = el.tagName.toLowerCase();
	if (tag.includes("-")) return true;
	if (el.hasAttribute("data-grammarly-shadow-root")) return true;
	if (el.className && typeof el.className === "string" && el.className.startsWith("gr_")) return true;
	return false;
}

function getPlainTextFromDOM(el: HTMLElement): string {
	let text = "";
	const walk = (node: Node) => {
		if (isExtensionNode(node)) return;
		if (node.nodeType === Node.TEXT_NODE) {
			text += (node.textContent ?? "").replace(/\u200B/g, "");
		} else if (node.nodeType === Node.ELEMENT_NODE) {
			const elem = node as HTMLElement;
			if (elem.tagName === "MARK" && elem.hasAttribute("data-mention")) {
				text += elem.textContent ?? "";
			} else if (elem.tagName === "BR") {
				text += "\n";
			} else {
				for (const child of elem.childNodes) walk(child);
			}
		}
	};
	walk(el);
	return text;
}

function getMarkupFromDOM(el: HTMLElement, triggers: TriggerConfig[]): string {
	let markup = "";
	const walk = (node: Node) => {
		if (isExtensionNode(node)) return;
		if (node.nodeType === Node.TEXT_NODE) {
			markup += (node.textContent ?? "").replace(/\u200B/g, "");
		} else if (node.nodeType === Node.ELEMENT_NODE) {
			const elem = node as HTMLElement;
			if (elem.tagName === "MARK" && elem.hasAttribute("data-mention")) {
				const trigger = elem.getAttribute("data-mention") ?? "";
				const id = elem.getAttribute("data-id") ?? "";
				const displayText = elem.textContent ?? "";
				const label = displayText.startsWith(trigger) ? displayText.slice(trigger.length) : displayText;
				const cfg = triggers.find((t) => t.char === trigger);
				if (cfg) {
					markup += createMentionMarkup({ id, label }, cfg);
				} else {
					markup += displayText;
				}
			} else if (elem.tagName === "BR") {
				markup += "\n";
			} else {
				for (const child of elem.childNodes) walk(child);
			}
		}
	};
	walk(el);
	return markup;
}

function getCursorOffset(el: HTMLElement): number {
	const sel = window.getSelection();
	if (!sel || sel.rangeCount === 0) return 0;
	const range = sel.getRangeAt(0);
	const pre = document.createRange();
	pre.selectNodeContents(el);
	pre.setEnd(range.startContainer, range.startOffset);
	const frag = pre.cloneContents();
	const temp = document.createElement("div");
	temp.appendChild(frag);
	return getPlainTextFromDOM(temp).length;
}

function getCaretRect(el: HTMLElement): { top: number; left: number; height: number } {
	const sel = window.getSelection();
	if (!sel || sel.rangeCount === 0) {
		const r = el.getBoundingClientRect();
		return { top: r.top, left: r.left, height: 20 };
	}

	const range = sel.getRangeAt(0).cloneRange();
	range.collapse(true);

	let rect = range.getBoundingClientRect();
	if (rect.height > 0) return { top: rect.top, left: rect.left, height: rect.height };

	const rects = range.getClientRects();
	if (rects.length > 0 && rects[0].height > 0) {
		return { top: rects[0].top, left: rects[0].left, height: rects[0].height };
	}

	const { startContainer, startOffset } = range;
	if (startContainer.nodeType === Node.TEXT_NODE) {
		const textLen = startContainer.textContent?.length ?? 0;
		if (startOffset < textLen) {
			range.setEnd(startContainer, startOffset + 1);
			rect = range.getBoundingClientRect();
			if (rect.height > 0) return { top: rect.top, left: rect.left, height: rect.height };
		}
		if (startOffset > 0) {
			range.setStart(startContainer, startOffset - 1);
			range.setEnd(startContainer, startOffset);
			rect = range.getBoundingClientRect();
			if (rect.height > 0) return { top: rect.top, left: rect.right, height: rect.height };
		}
	}

	const r = el.getBoundingClientRect();
	return { top: r.top, left: r.left, height: 20 };
}

function insertTextAtCursor(text: string): void {
	const success = document.execCommand("insertText", false, text);
	if (!success) {
		const sel = window.getSelection();
		if (sel && sel.rangeCount > 0) {
			const range = sel.getRangeAt(0);
			range.deleteContents();
			const node = document.createTextNode(text);
			range.insertNode(node);
			range.setStartAfter(node);
			range.collapse(true);
			sel.removeAllRanges();
			sel.addRange(range);
		}
	}
}

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
	const prevStatusRef = useRef<MentionState["status"]>("idle");
	const prevMentionsRef = useRef<Array<{ id: string; label: string; trigger: string }>>([]);
	const lastReportedMarkupRef = useRef("");
	const isComposingRef = useRef(false);

	const callbacksRef = useRef({ onChange, onSelect, onRemove, onQueryChange, onOpen, onClose, onError, onAcceptGhostText });
	callbacksRef.current = { onChange, onSelect, onRemove, onQueryChange, onOpen, onClose, onError, onAcceptGhostText };

	const ghostTextRef = useRef(ghostText);
	ghostTextRef.current = ghostText;

	const triggersRef = useRef(triggers);
	triggersRef.current = triggers;

	const isControlled = value !== undefined;
	const initialMarkup = isControlled ? value : defaultValue;

	const [state, dispatch] = useReducer(
		mentionReducer,
		createInitialState({
			markup: initialMarkup,
			plainText: markupToPlainText(initialMarkup, triggers),
		}),
	);

	const prevValueRef = useRef(value);
	useEffect(() => {
		if (!isControlled || value === prevValueRef.current || value === stateRef.current.markup) return;
		prevValueRef.current = value;
		const plainText = markupToPlainText(value, triggersRef.current);
		dispatch({
			type: "INPUT_CHANGE",
			markup: value,
			plainText,
			selectionStart: stateRef.current.selectionStart,
			selectionEnd: stateRef.current.selectionEnd,
		});
	}, [value, isControlled]);

	const stateRef = useRef(state);
	stateRef.current = state;

	const buildHTML = useCallback((markup: string): string => {
		const trigs = triggersRef.current;
		const segments = parseMarkup(markup, trigs);
		return segments.map((seg) => {
			if (seg.type === "mention") {
				const cfg = trigs.find((t) => t.char === seg.trigger);
				const bg = cfg?.color ?? "var(--mention-bg, oklch(0.93 0.03 250))";
				const radius = "var(--mention-radius, 3px)";
				return `<mark data-mention="${escapeHTML(seg.trigger)}" data-id="${escapeHTML(seg.id)}" contenteditable="false" style="background-color:${bg};border-radius:${radius};padding:0 2px">${escapeHTML(seg.text)}</mark>\u200B`;
			}
			return escapeHTML(seg.text);
		}).join("");
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

	useEffect(() => {
		const wasOpen = prevStatusRef.current === "suggesting" || prevStatusRef.current === "navigating";
		const isOpen = state.status === "suggesting" || state.status === "navigating";

		if (!wasOpen && isOpen && state.activeTrigger) {
			callbacksRef.current.onOpen?.(state.activeTrigger);
		} else if (wasOpen && !isOpen) {
			callbacksRef.current.onClose?.();
		}

		prevStatusRef.current = state.status;
	}, [state.status, state.activeTrigger]);

	useEffect(() => {
		if (!state.activeTrigger) return;

		const triggers = triggersRef.current;
		const triggerConfig = triggers.find((t) => t.char === state.activeTrigger);
		if (!triggerConfig) return;

		const { data } = triggerConfig;

		if (Array.isArray(data)) {
			let filtered = filterItems(data, state.query);
			if (triggerConfig.maxSuggestions) {
				filtered = filtered.slice(0, triggerConfig.maxSuggestions);
			}
			dispatch({ type: "FETCH_COMPLETE", items: filtered });
			return;
		}

		const delay = triggerConfig.debounce ?? 200;
		const controller = new AbortController();
		const queryAtFetchTime = state.query;

		const timer = setTimeout(() => {
			dispatch({ type: "FETCH_START" });

			const currentState = stateRef.current;
			const context = {
				textBefore: currentState.plainText.slice(0, currentState.queryStartIndex),
				textAfter: currentState.plainText.slice(currentState.queryEndIndex),
				activeMentions: extractMentions(currentState.markup, triggers),
				fullText: currentState.plainText,
			};

			data(queryAtFetchTime, context)
				.then((items) => {
					if (!controller.signal.aborted && stateRef.current.query === queryAtFetchTime) {
						dispatch({ type: "FETCH_COMPLETE", items });
					}
				})
				.catch((err) => {
					if (!controller.signal.aborted) {
						dispatch({ type: "FETCH_ERROR" });
						if (err instanceof Error) callbacksRef.current.onError?.(err);
					}
				});
		}, delay);

		return () => {
			clearTimeout(timer);
			controller.abort();
		};
	}, [state.activeTrigger, state.query]);

	useEffect(() => {
		if (state.activeTrigger && state.query !== undefined) {
			callbacksRef.current.onQueryChange?.(state.query, state.activeTrigger);
		}
	}, [state.query, state.activeTrigger]);

	const handleInput = useCallback(() => {
		if (isComposingRef.current) return;
		const el = editorRef.current;
		if (!el) return;

		const triggers = triggersRef.current;
		const cursorOffset = getCursorOffset(el);
		const newPlainText = getPlainTextFromDOM(el);
		const newMarkup = getMarkupFromDOM(el, triggers);

		const prevMentions = prevMentionsRef.current;
		const newSegments = parseMarkup(newMarkup, triggers);
		const newMentions = newSegments
			.filter((s): s is MentionSegment => s.type === "mention")
			.map((s) => ({ id: s.id, label: s.text.slice(s.trigger.length), trigger: s.trigger }));

		if (callbacksRef.current.onRemove && prevMentions.length > 0) {
			const newIds = new Set(newMentions.map((m) => `${m.trigger}:${m.id}`));
			for (const prev of prevMentions) {
				if (!newIds.has(`${prev.trigger}:${prev.id}`)) {
					callbacksRef.current.onRemove({ id: prev.id, label: prev.label }, prev.trigger);
				}
			}
		}

		prevMentionsRef.current = newMentions;

		dispatch({
			type: "INPUT_CHANGE",
			markup: newMarkup,
			plainText: newPlainText,
			selectionStart: cursorOffset,
			selectionEnd: cursorOffset,
		});

		const match = detectTrigger(newPlainText, cursorOffset, triggers);
		if (match) {
			dispatch({
				type: "TRIGGER_MATCH",
				trigger: match.trigger.char,
				query: match.query,
				startIndex: match.startIndex,
				endIndex: match.endIndex,
			});

			const caretPos = getCaretRect(el);
			dispatch({ type: "CARET_POSITION", position: caretPos });
		} else {
			dispatch({ type: "TRIGGER_LOST" });
		}

		lastReportedMarkupRef.current = newMarkup;
		callbacksRef.current.onChange?.(newMarkup, newPlainText);
	}, []);

	const handleSelect = useCallback((item: MentionItem, triggerOverride?: string, queryOverride?: string) => {
		const triggers = triggersRef.current;
		const activeTrigger = triggerOverride ?? stateRef.current.activeTrigger;
		const query = queryOverride ?? stateRef.current.query;
		const triggerConfig = triggers.find((t) => t.char === activeTrigger);

		if (!triggerConfig || !activeTrigger) {
			dispatch({ type: "TRIGGER_LOST" });
			return;
		}

		if (isComposingRef.current) {
			dispatch({ type: "TRIGGER_LOST" });
			return;
		}

		const el = editorRef.current;
		if (!el) {
			dispatch({ type: "TRIGGER_LOST" });
			return;
		}

		const sel = window.getSelection();
		if (!sel || sel.rangeCount === 0) {
			dispatch({ type: "TRIGGER_LOST" });
			return;
		}

		const range = sel.getRangeAt(0);
		let container: Node = range.startContainer;
		let offset = range.startOffset;

		if (container.nodeType === Node.ELEMENT_NODE) {
			if (offset > 0 && container.childNodes[offset - 1]?.nodeType === Node.TEXT_NODE) {
				container = container.childNodes[offset - 1];
				offset = container.textContent?.length ?? 0;
			} else if (offset < container.childNodes.length && container.childNodes[offset]?.nodeType === Node.TEXT_NODE) {
				container = container.childNodes[offset];
				offset = 0;
			} else {
				dispatch({ type: "TRIGGER_LOST" });
				return;
			}
		}

		if (container.nodeType !== Node.TEXT_NODE) {
			dispatch({ type: "TRIGGER_LOST" });
			return;
		}

		const triggerQueryLen = activeTrigger.length + query.length;
		if (offset < triggerQueryLen) {
			dispatch({ type: "TRIGGER_LOST" });
			return;
		}

		const startRawOffset = offset - triggerQueryLen;
		const expectedText = activeTrigger + query;
		const fullText = container.textContent ?? "";
		const actualText = fullText.slice(startRawOffset, offset);

		if (actualText !== expectedText) {
			dispatch({ type: "TRIGGER_LOST" });
			return;
		}

		const parent = container.parentNode;
		if (!parent || !el.contains(parent)) {
			dispatch({ type: "TRIGGER_LOST" });
			return;
		}

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
		const newMarkup = getMarkupFromDOM(el, triggers);
		const newCursor = getCursorOffset(el);

		const newSegments = parseMarkup(newMarkup, triggers);
		prevMentionsRef.current = newSegments
			.filter((s): s is MentionSegment => s.type === "mention")
			.map((s) => ({ id: s.id, label: s.text.slice(s.trigger.length), trigger: s.trigger }));

		dispatch({
			type: "INSERT_COMPLETE",
			markup: newMarkup,
			plainText: newPlainText,
			cursor: newCursor,
		});

		lastReportedMarkupRef.current = newMarkup;
		callbacksRef.current.onSelect?.(item, activeTrigger);
		callbacksRef.current.onChange?.(newMarkup, newPlainText);
	}, []);

	const wrappedDispatch = useCallback(
		(action: Parameters<typeof dispatch>[0]) => {
			if (action.type === "SELECT") {
				const trigger = stateRef.current.activeTrigger;
				const query = stateRef.current.query;
				handleSelect(action.item, trigger ?? undefined, query);
				return;
			}
			dispatch(action);
		},
		[handleSelect],
	);

	const clear = useCallback(() => {
		prevMentionsRef.current = [];
		dispatch({ type: "INPUT_CHANGE", markup: "", plainText: "", selectionStart: 0, selectionEnd: 0 });
		dispatch({ type: "TRIGGER_LOST" });
		if (editorRef.current) {
			editorRef.current.innerHTML = "";
		}
		lastReportedMarkupRef.current = "";
		callbacksRef.current.onChange?.("", "");
	}, []);

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

	const api = connect(state, wrappedDispatch, undefined, instanceId);

	const apiRef = useRef(api);
	apiRef.current = api;

	const mentions = useMemo(
		() => extractMentions(state.markup, triggersRef.current),
		[state.markup],
	);

	const wrappedOnKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
		if (e.key === "Tab" && ghostTextRef.current && !(apiRef.current.isOpen && stateRef.current.highlightedIndex >= 0)) {
			e.preventDefault();
			const el = editorRef.current;
			if (!el) return;
			insertTextAtCursor(ghostTextRef.current);
			callbacksRef.current.onAcceptGhostText?.();
			return;
		}
		const onKeyDown = apiRef.current.inputProps.onKeyDown as ((e: React.KeyboardEvent) => void) | undefined;
		onKeyDown?.(e as unknown as React.KeyboardEvent);
	}, []);

	const onCompositionStart = useCallback(() => {
		isComposingRef.current = true;
		dispatch({ type: "COMPOSITION_START" });
	}, []);

	const onCompositionEnd = useCallback(() => {
		isComposingRef.current = false;
		dispatch({ type: "COMPOSITION_END" });
	}, []);

	return {
		...api,
		inputProps: {
			...api.inputProps,
			onKeyDown: wrappedOnKeyDown,
			onCompositionStart,
			onCompositionEnd,
		},
		state,
		editorRef,
		markup: state.markup,
		plainText: state.plainText,
		mentions,
		clear,
		focus,
		insertTrigger,
		ghostText,
		buildHTML,
		syncEditor,
		handleInput,
	};
}
