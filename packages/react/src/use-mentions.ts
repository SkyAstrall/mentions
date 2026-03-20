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
	useLayoutEffect,
	useMemo,
	useReducer,
	useRef,
} from "react";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

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
		.replace(/"/g, "&quot;");
}

function getPlainTextFromDOM(el: HTMLElement): string {
	let text = "";
	const walk = (node: Node) => {
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
	return pre.toString().replace(/\u200B/g, "").length;
}

function getCaretRect(): { top: number; left: number; height: number } | null {
	const sel = window.getSelection();
	if (!sel || sel.rangeCount === 0) return null;
	const range = sel.getRangeAt(0).cloneRange();
	range.collapse(true);
	let rect = range.getBoundingClientRect();
	if (rect.width === 0 && rect.height === 0) {
		const span = document.createElement("span");
		span.textContent = "\u200B";
		range.insertNode(span);
		rect = span.getBoundingClientRect();
		const parent = span.parentNode;
		parent?.removeChild(span);
		parent?.normalize();
	}
	return { top: rect.top, left: rect.left, height: rect.height };
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
	if (isControlled && value !== prevValueRef.current && value !== state.markup) {
		const plainText = markupToPlainText(value, triggers);
		dispatch({
			type: "INPUT_CHANGE",
			markup: value,
			plainText,
			selectionStart: state.selectionStart,
			selectionEnd: state.selectionEnd,
		});
	}
	prevValueRef.current = value;

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

		const timer = setTimeout(() => {
			dispatch({ type: "FETCH_START" });

			const currentState = stateRef.current;
			const context = {
				textBefore: currentState.plainText.slice(0, currentState.queryStartIndex),
				textAfter: currentState.plainText.slice(currentState.queryEndIndex),
				activeMentions: extractMentions(currentState.markup, triggers),
				fullText: currentState.plainText,
			};

			data(state.query, context)
				.then((items) => {
					if (!controller.signal.aborted) {
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
		if (stateRef.current.isComposing) return;
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

			const caretPos = getCaretRect();
			if (caretPos) {
				dispatch({ type: "CARET_POSITION", position: caretPos });
			}
		} else if (stateRef.current.activeTrigger) {
			dispatch({ type: "TRIGGER_LOST" });
		}

		lastReportedMarkupRef.current = newMarkup;
		callbacksRef.current.onChange?.(newMarkup, newPlainText);
	}, []);

	const handleSelect = useCallback((item: MentionItem) => {
		const triggers = triggersRef.current;
		const activeTrigger = stateRef.current.activeTrigger;
		const query = stateRef.current.query;
		const triggerConfig = triggers.find((t) => t.char === activeTrigger);
		if (!triggerConfig || !activeTrigger) return;

		const el = editorRef.current;
		if (!el) return;

		const sel = window.getSelection();
		if (!sel || sel.rangeCount === 0) return;

		const range = sel.getRangeAt(0);
		const textNode = range.startContainer;
		if (textNode.nodeType !== Node.TEXT_NODE) return;

		const cursorRawOffset = range.startOffset;
		const triggerQueryLen = activeTrigger.length + query.length;
		const startRawOffset = cursorRawOffset - triggerQueryLen;
		if (startRawOffset < 0) return;

		const mark = document.createElement("mark");
		mark.setAttribute("data-mention", activeTrigger);
		mark.setAttribute("data-id", item.id);
		mark.contentEditable = "false";
		const bg = triggerConfig.color ?? "var(--mention-bg, oklch(0.93 0.03 250))";
		mark.style.cssText = `background-color:${bg};border-radius:var(--mention-radius, 3px);padding:0 2px`;
		mark.textContent = activeTrigger + item.label;

		const fullText = textNode.textContent!;
		const before = fullText.slice(0, startRawOffset);
		const after = fullText.slice(cursorRawOffset);

		const parent = textNode.parentNode!;
		const frag = document.createDocumentFragment();

		if (before) frag.appendChild(document.createTextNode(before));
		frag.appendChild(mark);

		const spacer = document.createTextNode("\u200B ");
		frag.appendChild(spacer);

		if (after) frag.appendChild(document.createTextNode(after));

		parent.replaceChild(frag, textNode);

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
				handleSelect(action.item);
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

		document.execCommand("insertText", false, insert);
	}, []);

	const api = useMemo(
		() => connect(state, wrappedDispatch, undefined, instanceId),
		[state, wrappedDispatch, instanceId],
	);

	const mentions = useMemo(
		() => extractMentions(state.markup, triggersRef.current),
		[state.markup],
	);

	const originalOnKeyDown = api.inputProps.onKeyDown as ((e: React.KeyboardEvent) => void) | undefined;

	const wrappedOnKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
		if (e.key === "Tab" && ghostTextRef.current && !(api.isOpen && state.highlightedIndex >= 0)) {
			e.preventDefault();
			const el = editorRef.current;
			if (!el) return;
			document.execCommand("insertText", false, ghostTextRef.current);
			callbacksRef.current.onAcceptGhostText?.();
			return;
		}
		originalOnKeyDown?.(e as unknown as React.KeyboardEvent);
	}, [api.isOpen, state.highlightedIndex, originalOnKeyDown]);

	return {
		...api,
		inputProps: {
			...api.inputProps,
			onKeyDown: wrappedOnKeyDown,
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
