import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { connect } from "./connect.ts";
import { MentionController } from "./controller.ts";
import type { MentionContext, MentionItem, MentionPage, TriggerConfig } from "./types.ts";

const first: MentionItem[] = [
	{ id: "1", label: "Alice" },
	{ id: "2", label: "Bob" },
];
const second: MentionItem[] = [
	{ id: "3", label: "Cara" },
	{ id: "4", label: "Dan" },
];
const controllers: MentionController[] = [];

function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason: Error) => void;
	const promise = new Promise<T>((accept, fail) => {
		resolve = accept;
		reject = fail;
	});
	return { promise, resolve, reject };
}

function create(
	data: TriggerConfig["data"],
	options: Partial<TriggerConfig> = {},
	onError = vi.fn(),
) {
	const controller = new MentionController({
		triggers: [{ char: "@", data, debounce: 0, ...options }],
		callbacks: { onError },
	});
	controllers.push(controller);
	return controller;
}

function input(controller: MentionController, text = "@"): void {
	controller.handleInputChange(text, text, text.length);
}

function view(controller: MentionController) {
	return connect(controller.getState(), "pages-acceptance");
}

function selected(controller: MentionController) {
	const api = view(controller);
	return api.items[api.highlightedIndex];
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
	for (const controller of controllers.splice(0)) controller.destroy();
	vi.useRealTimers();
});

describe("paginated suggestions", () => {
	it("passes cursors, keeps the list and highlight busy, and coalesces pending ArrowDown", async () => {
		const next = deferred<MentionPage>();
		const data = vi.fn(
			(_query: string, context: MentionContext): Promise<MentionPage> =>
				context.cursor === undefined
					? Promise.resolve({ items: first, hasMore: true, cursor: "page-2" })
					: next.promise,
		);
		const controller = create(data);
		input(controller);
		await vi.advanceTimersByTimeAsync(0);
		expect(data.mock.calls[0][1].cursor).toBeUndefined();
		expect(view(controller).hasMore).toBe(true);
		controller.handleKeyDown("End");
		controller.handleKeyDown("ArrowDown");
		controller.handleKeyDown("ArrowDown");
		controller.loadMore();
		await vi.advanceTimersByTimeAsync(0);
		expect(data).toHaveBeenCalledTimes(2);
		expect(data.mock.calls[1][1].cursor).toBe("page-2");
		expect(selected(controller)).toEqual(first[1]);
		expect(view(controller)).toMatchObject({ isOpen: true, isLoadingMore: true, items: first });
		expect(view(controller).listProps["aria-busy"]).toBe(true);
		expect(view(controller).inputProps["aria-activedescendant"]).toBe(
			view(controller).getItemProps(1).id,
		);
		next.resolve({ items: second, hasMore: false });
		await vi.advanceTimersByTimeAsync(0);
		expect(view(controller).items).toEqual([...first, ...second]);
		expect(selected(controller)).toEqual(second[0]);
		expect(view(controller).isLoadingMore).toBe(false);
		expect(view(controller).listProps["aria-busy"]).toBeFalsy();
		controller.loadMore();
		await vi.advanceTimersByTimeAsync(0);
		expect(data).toHaveBeenCalledTimes(2);
		controller.handleKeyDown("End");
		controller.handleKeyDown("ArrowDown");
		expect(selected(controller)).toEqual(first[0]);
	});

	it("loads at the scroll boundary and preserves item identity when groups merge", async () => {
		const next = deferred<MentionPage>();
		const team = { id: "team", label: "Platform", group: "teams" };
		const alice = { id: "alice", label: "Alice", group: "people" };
		const bob = { id: "bob", label: "Bob", group: "people" };
		const data = vi.fn(
			(_query: string, context: MentionContext): Promise<MentionPage> =>
				context.cursor === undefined
					? Promise.resolve({ items: [team, alice], hasMore: true, cursor: 2 })
					: next.promise,
		);
		const controller = create(data, {
			groups: [
				{ id: "people", label: "People" },
				{ id: "teams", label: "Teams" },
			],
		});
		input(controller);
		await vi.advanceTimersByTimeAsync(0);
		controller.handleKeyDown("End");
		controller.handleListScroll({ scrollTop: 0, clientHeight: 20, scrollHeight: 100 });
		await vi.advanceTimersByTimeAsync(0);
		expect(data).toHaveBeenCalledTimes(1);
		controller.handleListScroll({ scrollTop: 80, clientHeight: 20, scrollHeight: 100 });
		await vi.advanceTimersByTimeAsync(0);
		expect(data.mock.calls[1][1].cursor).toBe(2);
		next.resolve({ items: [bob], hasMore: false });
		await vi.advanceTimersByTimeAsync(0);
		expect(view(controller).items.map((item) => item.id)).toEqual(["alice", "bob", "team"]);
		expect(view(controller).groups.map((group) => group.items.length)).toEqual([2, 1]);
		expect(selected(controller)).toEqual(team);
		expect(controller.handleKeyDown("Enter")).toEqual({
			handled: true,
			action: "select",
			item: team,
		});
	});

	it("drops an older page even after the query changes away and back", async () => {
		const old = deferred<MentionPage>();
		const data = vi.fn(
			(query: string, context: MentionContext): Promise<MentionPage> =>
				context.cursor === undefined
					? Promise.resolve({ items: [{ id: query, label: query }], hasMore: true, cursor: "next" })
					: old.promise,
		);
		const controller = create(data);
		input(controller, "@a");
		await vi.advanceTimersByTimeAsync(0);
		controller.loadMore();
		await vi.advanceTimersByTimeAsync(0);
		const oldSignal = data.mock.calls[1][1].signal;
		input(controller, "@b");
		await vi.advanceTimersByTimeAsync(0);
		input(controller, "@a");
		await vi.advanceTimersByTimeAsync(0);
		expect(oldSignal?.aborted).toBe(true);
		expect(data.mock.calls.map(([query, context]) => [query, context.cursor])).toEqual([
			["a", undefined],
			["a", "next"],
			["b", undefined],
			["a", undefined],
		]);
		old.resolve({ items: [{ id: "stale", label: "Stale" }], hasMore: false });
		await vi.advanceTimersByTimeAsync(0);
		expect(view(controller).items).toEqual([{ id: "a", label: "a" }]);
		expect(view(controller).hasMore).toBe(true);
	});

	it("keeps loaded items on failure and retries the same cursor explicitly", async () => {
		const onError = vi.fn();
		const failure = new Error("Page failed");
		let attempts = 0;
		const data = vi.fn((_query: string, context: MentionContext): Promise<MentionPage> => {
			if (context.cursor === undefined)
				return Promise.resolve({ items: first, hasMore: true, cursor: "next" });
			attempts++;
			return attempts === 1
				? Promise.reject(failure)
				: Promise.resolve({ items: second, hasMore: false });
		});
		const controller = create(data, {}, onError);
		input(controller);
		await vi.advanceTimersByTimeAsync(0);
		controller.handleKeyDown("End");
		controller.loadMore();
		await vi.advanceTimersByTimeAsync(0);
		expect(onError).toHaveBeenCalledExactlyOnceWith(failure);
		expect(view(controller).items).toEqual(first);
		expect(selected(controller)).toEqual(first[1]);
		expect(view(controller)).toMatchObject({ isOpen: true, isLoadingMore: false, hasMore: true });
		controller.loadMore();
		await vi.advanceTimersByTimeAsync(0);
		expect(data.mock.calls.slice(1).map(([, context]) => context.cursor)).toEqual(["next", "next"]);
		expect(view(controller).items).toEqual([...first, ...second]);
	});

	it("caps accumulated pages and stops fetching at the whole-list limit", async () => {
		const data = vi.fn(
			(_query: string, context: MentionContext): Promise<MentionPage> =>
				Promise.resolve(
					context.cursor === undefined
						? { items: first, hasMore: true, cursor: "next" }
						: { items: second, hasMore: true, cursor: "third" },
				),
		);
		const controller = create(data, { maxSuggestions: 3 });
		input(controller);
		await vi.advanceTimersByTimeAsync(0);
		controller.loadMore();
		await vi.advanceTimersByTimeAsync(0);
		expect(view(controller).items).toEqual([...first, second[0]]);
		expect(view(controller).hasMore).toBe(false);
		controller.loadMore();
		await vi.advanceTimersByTimeAsync(0);
		expect(data).toHaveBeenCalledTimes(2);
	});

	it.each([
		"escape",
		"blur",
		"clear",
		"destroy",
	])("invalidates pending pages on %s", async (operation) => {
		const next = deferred<MentionPage>();
		const data = vi.fn(
			(_query: string, context: MentionContext): Promise<MentionPage> =>
				context.cursor === undefined
					? Promise.resolve({ items: first, hasMore: true, cursor: "next" })
					: next.promise,
		);
		const controller = create(data);
		input(controller);
		await vi.advanceTimersByTimeAsync(0);
		controller.loadMore();
		await vi.advanceTimersByTimeAsync(0);
		const signal = data.mock.calls[1][1].signal;
		if (operation === "escape") controller.handleKeyDown("Escape");
		if (operation === "blur") controller.handleBlur();
		if (operation === "clear") controller.clear();
		if (operation === "destroy") controller.destroy();
		const snapshot = controller.getState();
		expect(signal?.aborted).toBe(true);
		next.resolve({ items: second, hasMore: false });
		await vi.advanceTimersByTimeAsync(0);
		expect(controller.getState()).toEqual(snapshot);
	});

	it("keeps plain async arrays non-paginated with existing wrapping and ARIA ids", async () => {
		const data = vi.fn(async () => first);
		const controller = create(data);
		input(controller);
		await vi.advanceTimersByTimeAsync(0);
		expect(view(controller)).toMatchObject({
			items: first,
			hasMore: false,
			isLoadingMore: false,
			groups: [],
		});
		controller.handleKeyDown("End");
		controller.handleKeyDown("ArrowDown");
		expect(view(controller).highlightedIndex).toBe(0);
		expect(view(controller).getItemProps(0).id).toBe("mention-item-pages-acceptance-0");
		controller.loadMore();
		await vi.advanceTimersByTimeAsync(0);
		expect(data).toHaveBeenCalledTimes(1);
	});
});
