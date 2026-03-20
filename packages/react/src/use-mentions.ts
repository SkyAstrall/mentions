import {
	type MentionCallbacks,
	type MentionItem,
	type MentionSegment,
	type MentionState,
	type TriggerConfig,
	applyChange,
	connect,
	createInitialState,
	detectTrigger,
	extractMentions,
	filterItems,
	getCaretCoordinates,
	insertMention,
	markupToPlainText,
	mentionReducer,
	parseMarkup,
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

const useIsomorphicLayoutEffect =
	typeof window !== "undefined" ? useLayoutEffect : useEffect;

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
	/** Dimmed inline suggestion shown after the cursor. Tab accepts, any other key dismisses. */
	ghostText?: string;
	/** Called when the user presses Tab to accept the ghost text. */
	onAcceptGhostText?: () => void;
};

export type UseMentionsReturn = ReturnType<typeof connect> & {
	state: MentionState;
	textareaRef: RefObject<HTMLTextAreaElement | null>;
	overlayRef: RefObject<HTMLDivElement | null>;
	markup: string;
	plainText: string;
	mentions: MentionItem[];
	clear: () => void;
	focus: () => void;
	insertTrigger: (trigger: string) => void;
	ghostText?: string;
};

/**
 * Headless hook for mention/trigger functionality in a textarea or input.
 * Returns ARIA-ready props, state, and imperative helpers for building mention UIs.
 */
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
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);
	const overlayRef = useRef<HTMLDivElement | null>(null);
	const prevStatusRef = useRef<MentionState["status"]>("idle");
	const pendingCursorRef = useRef<number | null>(null);
	const prevMentionsRef = useRef<
		Array<{ id: string; label: string; trigger: string }>
	>([]);

	const callbacksRef = useRef({
		onChange,
		onSelect,
		onRemove,
		onQueryChange,
		onOpen,
		onClose,
		onError,
		onAcceptGhostText,
	});
	callbacksRef.current = {
		onChange,
		onSelect,
		onRemove,
		onQueryChange,
		onOpen,
		onClose,
		onError,
		onAcceptGhostText,
	};

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

	useIsomorphicLayoutEffect(() => {
		if (pendingCursorRef.current !== null && textareaRef.current) {
			const pos = pendingCursorRef.current;
			textareaRef.current.setSelectionRange(pos, pos);
			pendingCursorRef.current = null;
		}
	});

	useEffect(() => {
		const wasOpen =
			prevStatusRef.current === "suggesting" ||
			prevStatusRef.current === "navigating";
		const isOpen =
			state.status === "suggesting" || state.status === "navigating";

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

			const context = {
				textBefore: state.plainText.slice(0, state.queryStartIndex),
				textAfter: state.plainText.slice(state.queryEndIndex),
				activeMentions: extractMentions(state.markup, triggers),
				fullText: state.plainText,
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
						if (err instanceof Error)
							callbacksRef.current.onError?.(err);
					}
				});
		}, delay);

		return () => {
			clearTimeout(timer);
			controller.abort();
		};
	}, [
		state.activeTrigger,
		state.query,
		state.plainText,
		state.queryStartIndex,
		state.queryEndIndex,
		state.markup,
	]);

	useEffect(() => {
		if (state.activeTrigger && state.query !== undefined) {
			callbacksRef.current.onQueryChange?.(state.query, state.activeTrigger);
		}
	}, [state.query, state.activeTrigger]);

	const selectionStateRef = useRef({
		activeTrigger: state.activeTrigger,
		markup: state.markup,
		queryStartIndex: state.queryStartIndex,
		queryEndIndex: state.queryEndIndex,
	});
	selectionStateRef.current = {
		activeTrigger: state.activeTrigger,
		markup: state.markup,
		queryStartIndex: state.queryStartIndex,
		queryEndIndex: state.queryEndIndex,
	};

	const handleInput = (
		e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>,
	) => {
		if (state.isComposing) return;

		const triggers = triggersRef.current;
		const newPlainText = e.target.value;
		const selStart = e.target.selectionStart ?? 0;
		const selEnd = e.target.selectionEnd ?? 0;

		const newMarkup = applyChange(
			state.markup,
			newPlainText,
			state.plainText,
			triggers,
		);

		const prevMentions = prevMentionsRef.current;
		const newSegments = parseMarkup(newMarkup, triggers);
		const newMentions = newSegments
			.filter((s): s is MentionSegment => s.type === "mention")
			.map((s) => ({
				id: s.id,
				label: s.text.slice(s.trigger.length),
				trigger: s.trigger,
			}));

		if (callbacksRef.current.onRemove && prevMentions.length > 0) {
			const newIds = new Set(newMentions.map((m) => `${m.trigger}:${m.id}`));
			for (const prev of prevMentions) {
				if (!newIds.has(`${prev.trigger}:${prev.id}`)) {
					callbacksRef.current.onRemove(
						{ id: prev.id, label: prev.label },
						prev.trigger,
					);
				}
			}
		}

		prevMentionsRef.current = newMentions;

		dispatch({
			type: "INPUT_CHANGE",
			markup: newMarkup,
			plainText: newPlainText,
			selectionStart: selStart,
			selectionEnd: selEnd,
		});

		const match = detectTrigger(newPlainText, selStart, triggers);
		if (match) {
			dispatch({
				type: "TRIGGER_MATCH",
				trigger: match.trigger.char,
				query: match.query,
				startIndex: match.startIndex,
				endIndex: match.endIndex,
			});

			if (textareaRef.current) {
				const caretPos = getCaretCoordinates(
					textareaRef.current,
					match.startIndex,
				);
				dispatch({ type: "CARET_POSITION", position: caretPos });
			}
		} else if (state.activeTrigger) {
			dispatch({ type: "TRIGGER_LOST" });
		}

		callbacksRef.current.onChange?.(newMarkup, newPlainText);
	};

	const handleSelect = useCallback((item: MentionItem) => {
		const triggers = triggersRef.current;
		const { activeTrigger, markup, queryStartIndex, queryEndIndex } =
			selectionStateRef.current;
		const triggerConfig = triggers.find((t) => t.char === activeTrigger);
		if (!triggerConfig) return;

		const result = insertMention(
			markup,
			item,
			triggerConfig,
			queryStartIndex,
			queryEndIndex,
			triggers,
		);

		const newSegments = parseMarkup(result.markup, triggers);
		prevMentionsRef.current = newSegments
			.filter((s): s is MentionSegment => s.type === "mention")
			.map((s) => ({
				id: s.id,
				label: s.text.slice(s.trigger.length),
				trigger: s.trigger,
			}));

		pendingCursorRef.current = result.cursor;

		dispatch({
			type: "INSERT_COMPLETE",
			markup: result.markup,
			plainText: result.plainText,
			cursor: result.cursor,
		});

		callbacksRef.current.onSelect?.(item, triggerConfig.char);
		callbacksRef.current.onChange?.(result.markup, result.plainText);
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

	const handleScroll = () => {
		if (textareaRef.current && overlayRef.current) {
			overlayRef.current.scrollTop = textareaRef.current.scrollTop;
			overlayRef.current.scrollLeft = textareaRef.current.scrollLeft;
		}
	};

	const clear = useCallback(() => {
		prevMentionsRef.current = [];
		dispatch({
			type: "INPUT_CHANGE",
			markup: "",
			plainText: "",
			selectionStart: 0,
			selectionEnd: 0,
		});
		dispatch({ type: "TRIGGER_LOST" });
		if (textareaRef.current) {
			textareaRef.current.value = "";
		}
		callbacksRef.current.onChange?.("", "");
	}, []);

	const focus = useCallback(() => {
		textareaRef.current?.focus();
	}, []);

	const insertTrigger = useCallback((trigger: string) => {
		const el = textareaRef.current;
		if (!el) return;

		const cursor = el.selectionStart ?? el.value.length;
		const before = el.value.slice(0, cursor);
		const after = el.value.slice(cursor);
		const needsSpace = before.length > 0 && !/\s$/.test(before);
		const insert = (needsSpace ? " " : "") + trigger;
		const newPlainText = before + insert + after;
		const newCursor = cursor + insert.length;

		const triggers = triggersRef.current;
		const newMarkup = applyChange(
			selectionStateRef.current.markup,
			newPlainText,
			el.value,
			triggers,
		);

		dispatch({
			type: "INPUT_CHANGE",
			markup: newMarkup,
			plainText: newPlainText,
			selectionStart: newCursor,
			selectionEnd: newCursor,
		});

		const match = detectTrigger(newPlainText, newCursor, triggers);
		if (match) {
			dispatch({
				type: "TRIGGER_MATCH",
				trigger: match.trigger.char,
				query: match.query,
				startIndex: match.startIndex,
				endIndex: match.endIndex,
			});

			const caretPos = getCaretCoordinates(el, match.startIndex);
			dispatch({ type: "CARET_POSITION", position: caretPos });
		}

		pendingCursorRef.current = newCursor;
		callbacksRef.current.onChange?.(newMarkup, newPlainText);

		requestAnimationFrame(() => {
			el.focus();
		});
	}, []);

	const api = useMemo(
		() => connect(state, wrappedDispatch, undefined, instanceId),
		[state, wrappedDispatch, instanceId],
	);

	const mentions = useMemo(
		() => extractMentions(state.markup, triggersRef.current),
		[state.markup],
	);

	const originalOnKeyDown = api.inputProps.onKeyDown as
		| ((e: React.KeyboardEvent) => void)
		| undefined;

	const wrappedOnKeyDown = (
		e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>,
	) => {
		if (
			e.key === "Tab" &&
			ghostTextRef.current &&
			!(api.isOpen && state.highlightedIndex >= 0)
		) {
			e.preventDefault();
			const el = textareaRef.current;
			if (!el) return;
			const cursor = el.selectionStart ?? el.value.length;
			const gt = ghostTextRef.current;
			const newPlainText =
				state.plainText.slice(0, cursor) + gt + state.plainText.slice(cursor);
			const newCursor = cursor + gt.length;
			const triggers = triggersRef.current;

			const newMarkup = applyChange(
				state.markup,
				newPlainText,
				state.plainText,
				triggers,
			);

			dispatch({
				type: "INPUT_CHANGE",
				markup: newMarkup,
				plainText: newPlainText,
				selectionStart: newCursor,
				selectionEnd: newCursor,
			});
			pendingCursorRef.current = newCursor;
			callbacksRef.current.onAcceptGhostText?.();
			callbacksRef.current.onChange?.(newMarkup, newPlainText);
			return;
		}
		originalOnKeyDown?.(e);
	};

	return {
		...api,
		inputProps: {
			...api.inputProps,
			value: state.plainText,
			onChange: handleInput,
			onScroll: handleScroll,
			onKeyDown: wrappedOnKeyDown,
		},
		state,
		textareaRef,
		overlayRef,
		markup: state.markup,
		plainText: state.plainText,
		mentions,
		clear,
		focus,
		insertTrigger,
		ghostText,
	};
}
