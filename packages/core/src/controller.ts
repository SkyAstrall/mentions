import { filterItems } from "./filter.ts";
import { createInitialState, mentionReducer } from "./machine.ts";
import { extractMentions, markupToPlainText, parseMarkup } from "./markup.ts";
import { detectTrigger } from "./triggers.ts";
import type {
	CaretPosition,
	KeyDownResult,
	MentionControllerOptions,
	MentionItem,
	MentionSegment,
	MentionState,
} from "./types.ts";

/**
 * Framework-agnostic controller for the mention state machine.
 *
 * Follows TanStack's subscribe/getState pattern for compatibility with
 * `useSyncExternalStore` (React), `watchEffect` (Vue), `$effect` (Svelte 5), etc.
 *
 * Owns all business logic: state transitions, fetch orchestration (debounce, abort,
 * staleness), trigger detection, mention diffing, and callback invocation.
 * Adapters handle DOM rendering and wire framework events to controller methods.
 */
export class MentionController {
	private state: MentionState;
	private listeners = new Set<() => void>();
	private options: MentionControllerOptions;
	private fetchTimer: ReturnType<typeof setTimeout> | null = null;
	private fetchAbort: AbortController | null = null;
	private prevMentions: Array<{ id: string; label: string; trigger: string }> = [];
	private notifying = false;
	private pendingNotify = false;

	constructor(options: MentionControllerOptions) {
		const initialMarkup = options.initialMarkup ?? "";
		this.options = { ...options };
		this.state = createInitialState({
			markup: initialMarkup,
			plainText: markupToPlainText(initialMarkup, this.options.triggers),
		});
		this.prevMentions = this.mentionsFromMarkup(this.state.markup);
	}

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	getState(): MentionState {
		return this.state;
	}

	/**
	 * Update controller options (triggers, callbacks, filterFn).
	 * Does NOT trigger a notification — the adapter re-renders from its own prop changes.
	 */
	setOptions(options: Partial<MentionControllerOptions>): void {
		if (options.triggers) this.options.triggers = options.triggers;
		if (options.callbacks) this.options.callbacks = options.callbacks;
		if (options.filterFn !== undefined) this.options.filterFn = options.filterFn;
	}

	/**
	 * Called by the adapter after reading the DOM to derive markup, plainText, and cursor.
	 * Batches all state mutations into a single notification.
	 */
	handleInputChange(markup: string, plainText: string, cursor: number): void {
		const prevState = this.state;
		const callbacks = this.options.callbacks;

		this.diffMentions(markup);

		let next = mentionReducer(this.state, {
			type: "INPUT_CHANGE",
			markup,
			plainText,
			selectionStart: cursor,
			selectionEnd: cursor,
		});

		const match = detectTrigger(plainText, cursor, this.options.triggers);
		if (match) {
			next = mentionReducer(next, {
				type: "TRIGGER_MATCH",
				trigger: match.trigger.char,
				query: match.query,
				startIndex: match.startIndex,
				endIndex: match.endIndex,
			});
		} else {
			next = mentionReducer(next, { type: "TRIGGER_LOST" });
		}

		this.state = next;
		this.notify();

		this.emitOpenClose(prevState);

		if (match) {
			const triggerChanged = match.trigger.char !== prevState.activeTrigger;
			const queryChanged = match.query !== prevState.query;
			if (triggerChanged || queryChanged) {
				this.fetchForTrigger(match.trigger.char, match.query);
			}
			callbacks?.onQueryChange?.(match.query, match.trigger.char);
		} else if (prevState.activeTrigger) {
			this.cancelFetch();
		}

		callbacks?.onChange?.(markup, plainText);
	}

	/**
	 * Called by the adapter after it inserts a mention into the DOM.
	 */
	handleInsertComplete(markup: string, plainText: string, cursor: number, item: MentionItem): void {
		const trigger = this.state.activeTrigger ?? "";
		const callbacks = this.options.callbacks;

		this.state = mentionReducer(this.state, {
			type: "INSERT_COMPLETE",
			markup,
			plainText,
			cursor,
		});

		this.prevMentions = this.mentionsFromMarkup(markup);
		this.cancelFetch();
		this.notify();

		callbacks?.onSelect?.(item, trigger);
		callbacks?.onChange?.(markup, plainText);
	}

	/**
	 * Keyboard handler. Returns what happened so the adapter can call `preventDefault()`
	 * and perform DOM insertion when needed.
	 */
	handleKeyDown(key: string): KeyDownResult {
		const isOpen = this.state.status === "suggesting" || this.state.status === "navigating";
		if (!isOpen) return { handled: false };

		switch (key) {
			case "ArrowDown":
				this.dispatch({ type: "ARROW_DOWN" });
				return { handled: true };
			case "ArrowUp":
				this.dispatch({ type: "ARROW_UP" });
				return { handled: true };
			case "Home":
				this.dispatch({ type: "HOME" });
				return { handled: true };
			case "End":
				this.dispatch({ type: "END" });
				return { handled: true };
			case "Enter":
			case "Tab": {
				const item = this.state.items[this.state.highlightedIndex];
				if (this.state.highlightedIndex >= 0 && item) {
					return { handled: true, action: "select", item };
				}
				return { handled: false };
			}
			case "Escape":
				this.dispatch({ type: "ESCAPE" });
				return { handled: true };
			default:
				return { handled: false };
		}
	}

	handleBlur(): void {
		this.dispatch({ type: "BLUR" });
	}

	handleCompositionStart(): void {
		this.dispatch({ type: "COMPOSITION_START" });
	}

	handleCompositionEnd(): void {
		this.dispatch({ type: "COMPOSITION_END" });
	}

	updateCaretPosition(position: CaretPosition): void {
		this.dispatch({ type: "CARET_POSITION", position });
	}

	setValue(markup: string): void {
		if (markup === this.state.markup) return;
		const plainText = markupToPlainText(markup, this.options.triggers);
		this.state = mentionReducer(this.state, {
			type: "INPUT_CHANGE",
			markup,
			plainText,
			selectionStart: this.state.selectionStart,
			selectionEnd: this.state.selectionEnd,
		});
		this.notify();
	}

	clear(): void {
		this.prevMentions = [];
		this.cancelFetch();
		let next = mentionReducer(this.state, {
			type: "INPUT_CHANGE",
			markup: "",
			plainText: "",
			selectionStart: 0,
			selectionEnd: 0,
		});
		next = mentionReducer(next, { type: "TRIGGER_LOST" });
		this.state = next;
		this.notify();
		this.options.callbacks?.onChange?.("", "");
	}

	destroy(): void {
		this.cancelFetch();
		this.listeners.clear();
	}

	// -- Private --

	private dispatch(action: Parameters<typeof mentionReducer>[1]): void {
		const prev = this.state;
		this.state = mentionReducer(this.state, action);
		if (this.state !== prev) {
			this.notify();
			this.emitOpenClose(prev);
		}
	}

	private notify(): void {
		if (this.notifying) {
			this.pendingNotify = true;
			return;
		}
		this.notifying = true;
		try {
			for (const listener of this.listeners) {
				listener();
			}
		} finally {
			this.notifying = false;
		}
		if (this.pendingNotify) {
			this.pendingNotify = false;
			this.notify();
		}
	}

	private emitOpenClose(prev: MentionState): void {
		const callbacks = this.options.callbacks;
		const wasOpen = prev.status === "suggesting" || prev.status === "navigating";
		const isOpen = this.state.status === "suggesting" || this.state.status === "navigating";

		if (!wasOpen && isOpen && this.state.activeTrigger) {
			callbacks?.onOpen?.(this.state.activeTrigger);
		} else if (wasOpen && !isOpen) {
			callbacks?.onClose?.();
		}
	}

	private cancelFetch(): void {
		if (this.fetchTimer !== null) {
			clearTimeout(this.fetchTimer);
			this.fetchTimer = null;
		}
		if (this.fetchAbort) {
			this.fetchAbort.abort();
			this.fetchAbort = null;
		}
	}

	private fetchForTrigger(triggerChar: string, query: string): void {
		this.cancelFetch();

		const triggerConfig = this.options.triggers.find((t) => t.char === triggerChar);
		if (!triggerConfig) return;

		const { data } = triggerConfig;
		const filter = this.options.filterFn ?? filterItems;

		if (Array.isArray(data)) {
			let filtered = filter(data, query);
			if (triggerConfig.maxSuggestions) {
				filtered = filtered.slice(0, triggerConfig.maxSuggestions);
			}
			this.dispatch({ type: "FETCH_COMPLETE", items: filtered });
			return;
		}

		const delay = triggerConfig.debounce ?? 200;
		this.fetchAbort = new AbortController();
		const { signal } = this.fetchAbort;

		this.fetchTimer = setTimeout(() => {
			this.dispatch({ type: "FETCH_START" });

			const context = {
				textBefore: this.state.plainText.slice(0, this.state.queryStartIndex),
				textAfter: this.state.plainText.slice(this.state.queryEndIndex),
				activeMentions: extractMentions(this.state.markup, this.options.triggers),
				fullText: this.state.plainText,
			};

			data(query, context)
				.then((items) => {
					if (
						!signal.aborted &&
						this.state.activeTrigger === triggerChar &&
						this.state.query === query
					) {
						this.dispatch({ type: "FETCH_COMPLETE", items });
					}
				})
				.catch((err) => {
					if (!signal.aborted) {
						this.dispatch({ type: "FETCH_ERROR" });
						if (err instanceof Error) this.options.callbacks?.onError?.(err);
					}
				});
		}, delay);
	}

	private diffMentions(newMarkup: string): void {
		const newMentions = this.mentionsFromMarkup(newMarkup);
		const onRemove = this.options.callbacks?.onRemove;

		if (onRemove && this.prevMentions.length > 0) {
			const newIds = new Set(newMentions.map((m) => `${m.trigger}:${m.id}`));
			for (const prev of this.prevMentions) {
				if (!newIds.has(`${prev.trigger}:${prev.id}`)) {
					onRemove({ id: prev.id, label: prev.label }, prev.trigger);
				}
			}
		}

		this.prevMentions = newMentions;
	}

	private mentionsFromMarkup(
		markup: string,
	): Array<{ id: string; label: string; trigger: string }> {
		const segments = parseMarkup(markup, this.options.triggers);
		return segments
			.filter((s): s is MentionSegment => s.type === "mention")
			.map((s) => ({ id: s.id, label: s.text.slice(s.trigger.length), trigger: s.trigger }));
	}
}
