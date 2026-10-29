import { afterEach, expect, it, vi } from "vitest";
import { connect } from "./connect.ts";
import { MentionController } from "./controller.ts";

afterEach(() => vi.useRealTimers());

it("retains ungrouped option ids, wrapping and initial async loading", async () => {
	vi.useFakeTimers();
	const items = [{ id: "one", label: "One" }];
	let finish!: (result: typeof items) => void;
	const controller = new MentionController({
		triggers: [
			{
				char: "@",
				debounce: 0,
				data: () =>
					new Promise((resolve) => {
						finish = resolve;
					}),
			},
		],
	});
	controller.handleInputChange("@", "@", 1);
	expect(connect(controller.getState(), "legacy").isOpen).toBe(true);
	await vi.advanceTimersByTimeAsync(0);
	const loading = connect(controller.getState(), "legacy");
	expect(loading.isLoading).toBe(true);
	expect(loading.listProps["aria-busy"]).toBe(true);
	expect(loading.inputProps["aria-expanded"]).toBe(true);
	expect(loading.items).toEqual([]);
	finish(items);
	await vi.advanceTimersByTimeAsync(0);
	controller.handleKeyDown("End");
	controller.handleKeyDown("ArrowDown");
	const api = connect(controller.getState(), "legacy");
	expect(api.items).toEqual(items);
	expect(api.highlightedIndex).toBe(0);
	expect(api.getItemProps(0)).toEqual({
		id: "mention-item-legacy-0",
		role: "option",
		"aria-selected": true,
	});
	expect(api.listProps["aria-busy"]).toBeUndefined();
	controller.destroy();
});
