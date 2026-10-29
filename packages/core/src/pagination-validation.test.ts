import { afterEach, expect, it, vi } from "vitest";
import { connect } from "./connect.ts";
import { MentionController } from "./controller.ts";
import { createInitialState, mentionReducer } from "./machine.ts";
import type { MentionContext, MentionPage } from "./types.ts";

const first = { id: "first", label: "First" };
afterEach(() => vi.useRealTimers());

it("ignores page transitions after dismissal", () => {
	const state = createInitialState();
	expect(mentionReducer(state, { type: "PAGE_START" })).toBe(state);
	expect(mentionReducer(state, { type: "PAGE_ERROR" })).toBe(state);
	expect(
		mentionReducer(state, {
			type: "PAGE_COMPLETE",
			items: [first],
			groups: [],
			hasMore: false,
			highlightedIndex: 0,
		}),
	).toBe(state);
});

it("accepts scroll elements with framework metadata and preserves no highlight", async () => {
	vi.useFakeTimers();
	const controller = new MentionController({
		triggers: [
			{
				char: "@",
				debounce: 0,
				data: async (_query, context) =>
					context.cursor === undefined
						? { items: [first], hasMore: true, cursor: "next" }
						: { items: [{ id: "second", label: "Second" }], hasMore: false },
			},
		],
	});
	controller.handleInputChange("@", "@", 1);
	await vi.advanceTimersByTimeAsync(0);
	const element = { scrollTop: 80, clientHeight: 20, scrollHeight: 100, frameworkMetadata: {} };
	controller.handleListScroll(element);
	await vi.advanceTimersByTimeAsync(0);
	expect(controller.getState().items).toHaveLength(2);
	expect(controller.getState().highlightedIndex).toBe(-1);
	controller.destroy();
});

it.each([
	{ items: [], hasMore: true, cursor: "next" },
	{ items: [first], hasMore: true },
	{ items: [first], hasMore: true, cursor: "same" },
	{ items: [{ id: 1, label: "Invalid" }], hasMore: false },
])("preserves loaded items and reports an invalid next page: %j", async (page) => {
	vi.useFakeTimers();
	const onError = vi.fn();
	const controller = new MentionController({
		triggers: [
			{
				char: "@",
				debounce: 0,
				data: async (_query, context) =>
					context.cursor === undefined
						? { items: [first], hasMore: true, cursor: "same" }
						: (page as MentionPage),
			},
		],
		callbacks: { onError },
	});
	controller.handleInputChange("@", "@", 1);
	await vi.advanceTimersByTimeAsync(0);
	controller.handleKeyDown("End");
	controller.loadMore();
	await vi.advanceTimersByTimeAsync(0);
	expect(controller.getState().items).toEqual([first]);
	expect(controller.getState().highlightedIndex).toBe(0);
	expect(connect(controller.getState(), "validation").isLoadingMore).toBe(false);
	expect(onError).toHaveBeenCalledOnce();
	controller.destroy();
});

it("times out a pending page and cancels its signal without removing loaded items", async () => {
	vi.useFakeTimers();
	let signal: AbortSignal | undefined;
	const onError = vi.fn();
	const controller = new MentionController({
		triggers: [
			{
				char: "@",
				debounce: 0,
				data: (_query, context) => {
					if (context.cursor === undefined)
						return Promise.resolve({ items: [first], hasMore: true, cursor: "next" });
					signal = context.signal;
					return new Promise<MentionPage>(() => {});
				},
			},
		],
		callbacks: { onError },
	});
	controller.handleInputChange("@", "@", 1);
	await vi.advanceTimersByTimeAsync(0);
	controller.loadMore();
	await vi.advanceTimersByTimeAsync(30_000);
	expect(signal?.aborted).toBe(true);
	expect(onError).toHaveBeenCalledOnce();
	expect(controller.getState().items).toEqual([first]);
	expect(controller.getState().isLoadingMore).toBe(false);
	controller.destroy();
});

it("aborts a page when a mention is selected and ignores its later failure", async () => {
	vi.useFakeTimers();
	let reject!: (error: Error) => void;
	let signal: AbortSignal | undefined;
	const onError = vi.fn();
	const data = (_query: string, context: MentionContext): Promise<MentionPage> => {
		if (context.cursor === undefined)
			return Promise.resolve({ items: [first], hasMore: true, cursor: "next" });
		signal = context.signal;
		return new Promise((_resolve, fail) => {
			reject = fail;
		});
	};
	const controller = new MentionController({
		triggers: [{ char: "@", debounce: 0, data }],
		callbacks: { onError },
	});
	controller.handleInputChange("@", "@", 1);
	await vi.advanceTimersByTimeAsync(0);
	controller.loadMore();
	controller.handleInsertComplete("@[First](first) ", "@First ", 7, first);
	reject(new Error("Stale failure"));
	await vi.advanceTimersByTimeAsync(0);
	expect(signal?.aborted).toBe(true);
	expect(controller.getState().status).toBe("idle");
	expect(onError).not.toHaveBeenCalled();
	controller.destroy();
});
