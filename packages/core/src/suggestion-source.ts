import { filterItems } from "./filter.ts";
import { groupSuggestions, limitSuggestions } from "./groups.ts";
import { extractMentions } from "./markup.ts";
import type {
	MentionAction,
	MentionControllerOptions,
	MentionItem,
	MentionPage,
	MentionState,
	TriggerConfig,
} from "./types.ts";

export class SuggestionSource {
	private timer: ReturnType<typeof setTimeout> | undefined;
	private abort: AbortController | undefined;
	private cursor: string | number | undefined;
	private timeout: ReturnType<typeof setTimeout> | undefined;
	private advanceFrom: MentionItem | undefined;

	constructor(
		private options: () => MentionControllerOptions,
		private state: () => MentionState,
		private dispatch: (action: MentionAction) => void,
	) {}

	cancel(): void {
		clearTimeout(this.timer);
		clearTimeout(this.timeout);
		this.abort?.abort();
		this.abort = undefined;
		this.advanceFrom = undefined;
	}

	start(char: string, query: string): void {
		this.cancel();
		this.cursor = undefined;
		const options = this.options();
		const trigger = options.triggers.find((trigger) => trigger.char === char);
		if (!trigger) return;
		if (Array.isArray(trigger.data)) {
			const filtered = (options.filterFn ?? filterItems)(trigger.data, query);
			this.dispatch({
				type: "FETCH_COMPLETE",
				...limitSuggestions(filtered, trigger.groups, trigger.maxSuggestions),
			});
			return;
		}
		this.dispatch({ type: "PAGE_RESET" });
		const abort = new AbortController();
		this.abort = abort;
		this.timer = setTimeout(
			() => this.fetch(trigger, query, abort, false),
			trigger.debounce ?? 200,
		);
	}

	loadMore(advance = false): void {
		const state = this.state();
		if (!state.hasMore || (state.status !== "suggesting" && state.status !== "navigating")) return;
		if (advance) this.advanceFrom = state.items[state.highlightedIndex];
		if (state.isLoadingMore) return;
		const trigger = this.options().triggers.find((trigger) => trigger.char === state.activeTrigger);
		if (!trigger || Array.isArray(trigger.data)) return;
		const abort = new AbortController();
		this.abort = abort;
		this.dispatch({ type: "PAGE_START" });
		void this.fetch(trigger, state.query, abort, true);
	}

	private async fetch(
		trigger: TriggerConfig,
		query: string,
		abort: AbortController,
		append: boolean,
	): Promise<void> {
		if (Array.isArray(trigger.data) || abort.signal.aborted) return;
		if (!append) this.dispatch({ type: "FETCH_START" });
		const state = this.state();
		const cursor = append ? this.cursor : undefined;
		const timeout = setTimeout(() => {
			if (this.abort !== abort || abort.signal.aborted) return;
			abort.abort();
			this.fail(new Error("Suggestions request timed out"), append);
		}, 30_000);
		this.timeout = timeout;
		try {
			const result = await trigger.data(query, {
				textBefore: state.plainText.slice(0, state.queryStartIndex),
				textAfter: state.plainText.slice(state.queryEndIndex),
				activeMentions: extractMentions(state.markup, this.options().triggers),
				fullText: state.plainText,
				cursor,
				signal: abort.signal,
			});
			if (this.abort !== abort || abort.signal.aborted) return;
			this.validate(result, cursor);
			const page = Array.isArray(result) ? { items: result, hasMore: false } : result;
			const current = this.state();
			const incoming = append
				? groupSuggestions(page.items, trigger.groups).items.slice(
						0,
						trigger.maxSuggestions === undefined
							? undefined
							: Math.max(0, trigger.maxSuggestions - current.items.length),
					)
				: page.items;
			const grouped = append
				? groupSuggestions([...current.items, ...incoming], trigger.groups)
				: limitSuggestions(incoming, trigger.groups, trigger.maxSuggestions);
			const hasMore =
				page.hasMore &&
				(trigger.maxSuggestions === undefined || grouped.items.length < trigger.maxSuggestions);
			this.cursor = page.cursor;
			if (append) {
				const selected = current.items[current.highlightedIndex];
				let index = selected ? grouped.items.indexOf(selected) : -1;
				if (this.advanceFrom && this.advanceFrom === selected && incoming.length)
					index = grouped.items.indexOf(incoming[0]);
				this.advanceFrom = undefined;
				this.dispatch({ type: "PAGE_COMPLETE", ...grouped, hasMore, highlightedIndex: index });
			} else {
				this.dispatch({ type: "FETCH_COMPLETE", ...grouped, hasMore });
			}
		} catch (error) {
			if (this.abort === abort && !abort.signal.aborted) this.fail(error, append);
		} finally {
			clearTimeout(timeout);
		}
	}

	private validate(result: MentionItem[] | MentionPage, cursor: string | number | undefined): void {
		const items = Array.isArray(result) ? result : result?.items;
		if (
			!Array.isArray(items) ||
			items.some(
				(item) =>
					!item ||
					typeof item.id !== "string" ||
					typeof item.label !== "string" ||
					(item.group !== undefined && typeof item.group !== "string"),
			)
		) {
			throw new Error("Invalid suggestions items");
		}
		if (
			!Array.isArray(result) &&
			(typeof result.hasMore !== "boolean" ||
				(result.hasMore &&
					(!items.length ||
						(typeof result.cursor !== "string" && typeof result.cursor !== "number") ||
						result.cursor === cursor)))
		) {
			throw new Error("A page with more results must contain items and an advancing cursor");
		}
	}

	private fail(error: unknown, append: boolean): void {
		this.advanceFrom = undefined;
		this.dispatch({ type: append ? "PAGE_ERROR" : "FETCH_ERROR" });
		this.options().callbacks?.onError?.(error instanceof Error ? error : new Error(String(error)));
	}
}
