import { describe, expect, it, vi } from "vitest";
import { MentionController } from "./controller.ts";
import type { MentionItem, TriggerConfig } from "./types.ts";

const users: MentionItem[] = [
	{ id: "1", label: "Alice" },
	{ id: "2", label: "Bob" },
	{ id: "3", label: "Charlie" },
];

const tags: MentionItem[] = [
	{ id: "t1", label: "bug" },
	{ id: "t2", label: "feature" },
];

const triggers: TriggerConfig[] = [
	{ char: "@", data: users },
	{ char: "#", data: tags },
];

function createController(
	overrides?: Partial<Parameters<typeof MentionController.prototype.setOptions>[0]>,
) {
	return new MentionController({ triggers, ...overrides });
}

describe("MentionController", () => {
	// -- Construction --

	it("initializes with idle state and empty markup", () => {
		const ctrl = createController();
		const s = ctrl.getState();
		expect(s.status).toBe("idle");
		expect(s.markup).toBe("");
		expect(s.plainText).toBe("");
	});

	it("initializes with provided markup", () => {
		const ctrl = new MentionController({
			triggers,
			initialMarkup: "Hello @[Alice](1) world",
		});
		const s = ctrl.getState();
		expect(s.markup).toBe("Hello @[Alice](1) world");
		expect(s.plainText).toBe("Hello @Alice world");
	});

	// -- subscribe / notify --

	it("subscribe returns unsubscribe function", () => {
		const ctrl = createController();
		const listener = vi.fn();
		const unsub = ctrl.subscribe(listener);

		ctrl.handleInputChange("x", "x", 1);
		expect(listener).toHaveBeenCalled();

		listener.mockClear();
		unsub();
		ctrl.handleInputChange("y", "y", 1);
		expect(listener).not.toHaveBeenCalled();
	});

	it("notifies all listeners on state change", () => {
		const ctrl = createController();
		const l1 = vi.fn();
		const l2 = vi.fn();
		ctrl.subscribe(l1);
		ctrl.subscribe(l2);

		ctrl.handleInputChange("hi", "hi", 2);
		expect(l1).toHaveBeenCalled();
		expect(l2).toHaveBeenCalled();
	});

	// -- handleInputChange --

	it("updates markup and plainText on input change", () => {
		const ctrl = createController();
		ctrl.handleInputChange("hello", "hello", 5);
		const s = ctrl.getState();
		expect(s.markup).toBe("hello");
		expect(s.plainText).toBe("hello");
		expect(s.selectionStart).toBe(5);
	});

	it("detects trigger and fetches sync data", () => {
		const ctrl = createController();
		ctrl.handleInputChange("@al", "@al", 3);
		const s = ctrl.getState();
		expect(s.status).toBe("suggesting");
		expect(s.activeTrigger).toBe("@");
		expect(s.query).toBe("al");
		expect(s.items).toHaveLength(1);
		expect(s.items[0].label).toBe("Alice");
	});

	it("detects second trigger type", () => {
		const ctrl = createController();
		ctrl.handleInputChange("#b", "#b", 2);
		const s = ctrl.getState();
		expect(s.activeTrigger).toBe("#");
		expect(s.items).toHaveLength(1);
		expect(s.items[0].label).toBe("bug");
	});

	it("resets to idle when trigger is lost", () => {
		const ctrl = createController();
		ctrl.handleInputChange("@a", "@a", 2);
		expect(ctrl.getState().status).toBe("suggesting");

		ctrl.handleInputChange("hello", "hello", 5);
		expect(ctrl.getState().status).toBe("idle");
		expect(ctrl.getState().activeTrigger).toBeNull();
	});

	it("calls onChange callback", () => {
		const onChange = vi.fn();
		const ctrl = new MentionController({
			triggers,
			callbacks: { onChange },
		});
		ctrl.handleInputChange("hi", "hi", 2);
		expect(onChange).toHaveBeenCalledWith("hi", "hi");
	});

	it("calls onOpen/onClose callbacks", () => {
		const onOpen = vi.fn();
		const onClose = vi.fn();
		const ctrl = new MentionController({
			triggers,
			callbacks: { onOpen, onClose },
		});

		ctrl.handleInputChange("@", "@", 1);
		expect(onOpen).toHaveBeenCalledWith("@");

		ctrl.handleInputChange("hello", "hello", 5);
		expect(onClose).toHaveBeenCalled();
	});

	it("calls onQueryChange", () => {
		const onQueryChange = vi.fn();
		const ctrl = new MentionController({
			triggers,
			callbacks: { onQueryChange },
		});

		ctrl.handleInputChange("@al", "@al", 3);
		expect(onQueryChange).toHaveBeenCalledWith("al", "@");
	});

	it("calls onRemove when a mention is deleted", () => {
		const onRemove = vi.fn();
		const ctrl = new MentionController({
			triggers,
			initialMarkup: "Hey @[Alice](1) hi",
			callbacks: { onRemove },
		});

		ctrl.handleInputChange("Hey  hi", "Hey  hi", 4);
		expect(onRemove).toHaveBeenCalledWith({ id: "1", label: "Alice" }, "@");
	});

	it("respects maxSuggestions", () => {
		const ctrl = new MentionController({
			triggers: [{ char: "@", data: users, maxSuggestions: 2 }],
		});
		ctrl.handleInputChange("@", "@", 1);
		expect(ctrl.getState().items).toHaveLength(2);
	});

	it("respects custom filterFn", () => {
		const ctrl = new MentionController({
			triggers,
			filterFn: (items, q) => items.filter((i) => i.label.startsWith(q)),
		});
		ctrl.handleInputChange("@a", "@a", 2);
		expect(ctrl.getState().items).toHaveLength(0);

		ctrl.handleInputChange("@A", "@A", 2);
		expect(ctrl.getState().items).toHaveLength(1);
		expect(ctrl.getState().items[0].label).toBe("Alice");
	});

	// -- handleKeyDown --

	it("handles ArrowDown/ArrowUp navigation", () => {
		const ctrl = createController();
		ctrl.handleInputChange("@", "@", 1);

		let r = ctrl.handleKeyDown("ArrowDown");
		expect(r.handled).toBe(true);
		expect(ctrl.getState().highlightedIndex).toBe(0);

		r = ctrl.handleKeyDown("ArrowDown");
		expect(r.handled).toBe(true);
		expect(ctrl.getState().highlightedIndex).toBe(1);

		r = ctrl.handleKeyDown("ArrowUp");
		expect(r.handled).toBe(true);
		expect(ctrl.getState().highlightedIndex).toBe(0);
	});

	it("returns select action on Enter with highlighted item", () => {
		const ctrl = createController();
		ctrl.handleInputChange("@", "@", 1);
		ctrl.handleKeyDown("ArrowDown");

		const r = ctrl.handleKeyDown("Enter");
		expect(r.handled).toBe(true);
		expect("action" in r && r.action).toBe("select");
		expect("item" in r && r.item).toEqual({ id: "1", label: "Alice" });
	});

	it("returns handled:false on Enter with no highlighted item", () => {
		const ctrl = createController();
		ctrl.handleInputChange("@", "@", 1);

		const r = ctrl.handleKeyDown("Enter");
		expect(r.handled).toBe(false);
	});

	it("handles Escape", () => {
		const ctrl = createController();
		ctrl.handleInputChange("@", "@", 1);
		expect(ctrl.getState().status).toBe("suggesting");

		const r = ctrl.handleKeyDown("Escape");
		expect(r.handled).toBe(true);
		expect(ctrl.getState().status).toBe("idle");
	});

	it("returns handled:false when not open", () => {
		const ctrl = createController();
		expect(ctrl.handleKeyDown("ArrowDown").handled).toBe(false);
		expect(ctrl.handleKeyDown("Enter").handled).toBe(false);
		expect(ctrl.handleKeyDown("Escape").handled).toBe(false);
	});

	// -- handleInsertComplete --

	it("resets state and calls callbacks on insert complete", () => {
		const onSelect = vi.fn();
		const onChange = vi.fn();
		const ctrl = new MentionController({
			triggers,
			callbacks: { onSelect, onChange },
		});

		ctrl.handleInputChange("@al", "@al", 3);
		expect(ctrl.getState().activeTrigger).toBe("@");

		ctrl.handleInsertComplete("@[Alice](1) ", "@Alice ", 7, { id: "1", label: "Alice" });

		const s = ctrl.getState();
		expect(s.status).toBe("idle");
		expect(s.activeTrigger).toBeNull();
		expect(s.markup).toBe("@[Alice](1) ");
		expect(s.plainText).toBe("@Alice ");
		expect(onSelect).toHaveBeenCalledWith({ id: "1", label: "Alice" }, "@");
		expect(onChange).toHaveBeenCalledWith("@[Alice](1) ", "@Alice ");
	});

	// -- handleBlur --

	it("resets to idle on blur", () => {
		const ctrl = createController();
		ctrl.handleInputChange("@", "@", 1);
		expect(ctrl.getState().status).toBe("suggesting");

		ctrl.handleBlur();
		expect(ctrl.getState().status).toBe("idle");
	});

	// -- handleComposition --

	it("tracks composition state", () => {
		const ctrl = createController();
		ctrl.handleCompositionStart();
		expect(ctrl.getState().isComposing).toBe(true);

		ctrl.handleCompositionEnd();
		expect(ctrl.getState().isComposing).toBe(false);
	});

	// -- updateCaretPosition --

	it("updates caret position", () => {
		const ctrl = createController();
		ctrl.updateCaretPosition({ top: 100, left: 200, height: 20 });
		expect(ctrl.getState().caretPosition).toEqual({ top: 100, left: 200, height: 20 });
	});

	// -- setValue --

	it("sets controlled value", () => {
		const ctrl = createController();
		ctrl.setValue("@[Bob](2) is here");
		const s = ctrl.getState();
		expect(s.markup).toBe("@[Bob](2) is here");
		expect(s.plainText).toBe("@Bob is here");
	});

	it("no-ops if value is same as current markup", () => {
		const listener = vi.fn();
		const ctrl = createController();
		ctrl.handleInputChange("hi", "hi", 2);
		ctrl.subscribe(listener);
		ctrl.setValue("hi");
		expect(listener).not.toHaveBeenCalled();
	});

	// -- clear --

	it("clears all state and calls onChange", () => {
		const onChange = vi.fn();
		const ctrl = new MentionController({
			triggers,
			initialMarkup: "Hello @[Alice](1)",
			callbacks: { onChange },
		});

		ctrl.clear();
		const s = ctrl.getState();
		expect(s.markup).toBe("");
		expect(s.plainText).toBe("");
		expect(s.status).toBe("idle");
		expect(onChange).toHaveBeenCalledWith("", "");
	});

	// -- setOptions --

	it("updates triggers via setOptions", () => {
		const ctrl = createController();
		ctrl.handleInputChange("@al", "@al", 3);
		expect(ctrl.getState().items).toHaveLength(1);
		expect(ctrl.getState().items[0].label).toBe("Alice");

		const newTriggers: TriggerConfig[] = [{ char: "@", data: [{ id: "x", label: "Xavier" }] }];
		ctrl.setOptions({ triggers: newTriggers });
		ctrl.handleInputChange("@x", "@x", 2);
		expect(ctrl.getState().items).toHaveLength(1);
		expect(ctrl.getState().items[0].label).toBe("Xavier");
	});

	// -- destroy --

	it("cleans up on destroy", () => {
		const ctrl = createController();
		const listener = vi.fn();
		ctrl.subscribe(listener);

		ctrl.destroy();

		ctrl.handleInputChange("x", "x", 1);
		expect(listener).not.toHaveBeenCalled();
	});

	// -- Async data --

	it("handles async data with debounce", async () => {
		let resolveFetch: (items: MentionItem[]) => void;
		const asyncData = vi.fn(
			() =>
				new Promise<MentionItem[]>((resolve) => {
					resolveFetch = resolve;
				}),
		);

		const ctrl = new MentionController({
			triggers: [{ char: "@", data: asyncData, debounce: 10 }],
		});

		ctrl.handleInputChange("@al", "@al", 3);
		expect(ctrl.getState().status).toBe("suggesting");

		await new Promise((r) => setTimeout(r, 15));
		expect(ctrl.getState().status).toBe("loading");
		expect(asyncData).toHaveBeenCalledWith("al", expect.any(Object));

		resolveFetch!([{ id: "1", label: "Alice" }]);
		await new Promise((r) => setTimeout(r, 5));
		expect(ctrl.getState().items).toHaveLength(1);
		expect(ctrl.getState().items[0].label).toBe("Alice");
	});

	it("aborts stale async requests on new input", async () => {
		let resolveFirst: (v: MentionItem[]) => void;
		const firstCall = new Promise<MentionItem[]>((r) => {
			resolveFirst = r;
		});
		let callCount = 0;

		const asyncData = vi.fn(() => {
			callCount++;
			if (callCount === 1) return firstCall;
			return Promise.resolve([{ id: "2", label: "Bob" }]);
		});

		const ctrl = new MentionController({
			triggers: [{ char: "@", data: asyncData, debounce: 5 }],
		});

		ctrl.handleInputChange("@a", "@a", 2);
		await new Promise((r) => setTimeout(r, 10));

		ctrl.handleInputChange("@b", "@b", 2);
		await new Promise((r) => setTimeout(r, 10));

		resolveFirst!([{ id: "1", label: "Alice" }]);
		await new Promise((r) => setTimeout(r, 10));

		expect(ctrl.getState().items[0].label).toBe("Bob");
	});

	it("handles async fetch errors gracefully", async () => {
		const onError = vi.fn();
		const ctrl = new MentionController({
			triggers: [
				{
					char: "@",
					data: () => Promise.reject(new Error("network fail")),
					debounce: 5,
				},
			],
			callbacks: { onError },
		});

		ctrl.handleInputChange("@a", "@a", 2);
		await new Promise((r) => setTimeout(r, 20));

		expect(ctrl.getState().status).toBe("idle");
		expect(onError).toHaveBeenCalledWith(expect.any(Error));
	});
});
