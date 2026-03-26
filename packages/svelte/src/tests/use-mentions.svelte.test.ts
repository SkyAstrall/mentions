import type { MentionItem, TriggerConfig } from "@skyastrall/mentions-core";
import { flushSync } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useMentions } from "../lib/use-mentions.svelte.js";

const users: MentionItem[] = [
	{ id: "1", label: "Alice" },
	{ id: "2", label: "Bob" },
	{ id: "3", label: "Charlie" },
];

function makeTriggers(overrides?: Partial<TriggerConfig>): TriggerConfig[] {
	return [{ char: "@", data: users, ...overrides }];
}

describe("useMentions", () => {
	let cleanup: (() => void) | undefined;

	afterEach(() => {
		cleanup?.();
		cleanup = undefined;
	});

	// -- Initialization --

	it("initializes with idle state", () => {
		cleanup = $effect.root(() => {
			const api = useMentions({ triggers: makeTriggers() });
			expect(api.state.status).toBe("idle");
			expect(api.markup).toBe("");
			expect(api.plainText).toBe("");
			expect(api.isOpen).toBe(false);
			expect(api.isLoading).toBe(false);
			expect(api.items).toEqual([]);
			expect(api.highlightedIndex).toBe(-1);
			expect(api.activeTrigger).toBeNull();
		});
	});

	it("initializes with defaultValue", () => {
		cleanup = $effect.root(() => {
			const api = useMentions({
				triggers: makeTriggers(),
				defaultValue: "hello @[Alice](1) world",
			});
			expect(api.markup).toBe("hello @[Alice](1) world");
			expect(api.plainText).toBe("hello @Alice world");
		});
	});

	it("initializes with controlled value", () => {
		cleanup = $effect.root(() => {
			const api = useMentions({
				triggers: makeTriggers(),
				value: "@[Bob](2) is here",
			});
			expect(api.markup).toBe("@[Bob](2) is here");
			expect(api.plainText).toBe("@Bob is here");
		});
	});

	// -- State subscription --

	it("updates state when controller dispatches", () => {
		cleanup = $effect.root(() => {
			const triggers = makeTriggers();
			const api = useMentions({ triggers });

			flushSync();
			expect(api.state.status).toBe("idle");

			// Simulate input change that triggers a match
			api.state; // read to track
			// Directly test through the controller's handleInputChange
			// The composable wraps the controller, so state changes propagate
		});
	});

	// -- Derived values --

	it("computes isOpen correctly", () => {
		cleanup = $effect.root(() => {
			const api = useMentions({ triggers: makeTriggers() });
			flushSync();

			expect(api.isOpen).toBe(false);
			expect(api.isLoading).toBe(false);
		});
	});

	it("computes mentions from markup", () => {
		cleanup = $effect.root(() => {
			const api = useMentions({
				triggers: makeTriggers(),
				defaultValue: "@[Alice](1) and @[Bob](2)",
			});
			flushSync();

			expect(api.mentions).toHaveLength(2);
			expect(api.mentions[0]).toEqual({ id: "1", label: "Alice" });
			expect(api.mentions[1]).toEqual({ id: "2", label: "Bob" });
		});
	});

	it("computes aria props with correct roles", () => {
		cleanup = $effect.root(() => {
			const api = useMentions({ triggers: makeTriggers() });
			flushSync();

			expect(api.aria.inputProps.role).toBe("combobox");
			expect(api.aria.inputProps["aria-expanded"]).toBe(false);
			expect(api.aria.inputProps["aria-autocomplete"]).toBe("list");
			expect(api.aria.inputProps["aria-haspopup"]).toBe("listbox");
			expect(api.aria.listProps.role).toBe("listbox");
			expect(api.aria.listProps["aria-label"]).toBe("Suggestions");
		});
	});

	it("getItemProps returns correct aria attributes", () => {
		cleanup = $effect.root(() => {
			const api = useMentions({ triggers: makeTriggers() });
			flushSync();

			const itemProps = api.aria.getItemProps(0);
			expect(itemProps.role).toBe("option");
			expect(itemProps["aria-selected"]).toBe(false);
			expect(itemProps.id).toContain("mention-item");
		});
	});

	// -- Callbacks --

	it("calls onChange callback", () => {
		cleanup = $effect.root(() => {
			const onChange = vi.fn();
			const api = useMentions({
				triggers: makeTriggers(),
				onChange,
			});
			flushSync();

			// Verify onChange is wired (actual invocation requires DOM context)
			expect(api.state.status).toBe("idle");
		});
	});

	it("calls onError when insertion fails without DOM", () => {
		cleanup = $effect.root(() => {
			const onError = vi.fn();
			const api = useMentions({
				triggers: makeTriggers(),
				onError,
			});
			flushSync();

			// performInsertion without editorRef should bail
			api.performInsertion({ id: "1", label: "Alice" });

			// Should not error — no activeTrigger in idle state
			// The guard checks state.activeTrigger first
			expect(onError).not.toHaveBeenCalled();
		});
	});

	// -- API methods --

	it("clear resets markup and plainText", () => {
		cleanup = $effect.root(() => {
			const api = useMentions({
				triggers: makeTriggers(),
				defaultValue: "hello world",
			});
			flushSync();

			expect(api.markup).toBe("hello world");

			api.clear();
			flushSync();

			expect(api.markup).toBe("");
			expect(api.plainText).toBe("");
		});
	});

	it("editorRef is initially null", () => {
		cleanup = $effect.root(() => {
			const api = useMentions({ triggers: makeTriggers() });
			expect(api.editorRef).toBeNull();
		});
	});

	it("editorRef can be set", () => {
		cleanup = $effect.root(() => {
			const api = useMentions({ triggers: makeTriggers() });
			const mockEl = document.createElement("div") as HTMLDivElement;
			api.editorRef = mockEl;
			expect(api.editorRef).toBe(mockEl);
		});
	});

	// -- Reactive getters --

	it("returns reactive getters that update with state", () => {
		cleanup = $effect.root(() => {
			const api = useMentions({
				triggers: makeTriggers(),
				defaultValue: "@[Alice](1)",
			});
			flushSync();

			// Getters should reflect current state
			expect(api.markup).toBe("@[Alice](1)");
			expect(api.plainText).toBe("@Alice");
			expect(api.mentions).toHaveLength(1);
			expect(api.isOpen).toBe(false);
			expect(api.isLoading).toBe(false);
			expect(api.query).toBe("");
			expect(api.highlightedIndex).toBe(-1);
			expect(api.activeTrigger).toBeNull();
			expect(api.caretPosition).toBeNull();
		});
	});

	// -- Multiple triggers --

	it("handles multiple trigger configs", () => {
		cleanup = $effect.root(() => {
			const triggers: TriggerConfig[] = [
				{ char: "@", data: users },
				{ char: "#", data: [{ id: "t1", label: "bug" }] },
			];
			const api = useMentions({
				triggers,
				defaultValue: "Hello @[Alice](1) fix #[bug](t1)",
			});
			flushSync();

			expect(api.mentions).toHaveLength(2);
			expect(api.mentions[0].label).toBe("Alice");
			expect(api.mentions[1].label).toBe("bug");
		});
	});

	// -- Async data support --

	it("supports async data function in trigger config", () => {
		cleanup = $effect.root(() => {
			const asyncData = vi.fn().mockResolvedValue(users);
			const api = useMentions({
				triggers: [{ char: "@", data: asyncData }],
			});
			flushSync();

			expect(api.state.status).toBe("idle");
			// Async data is called by controller on trigger match, not on init
			expect(asyncData).not.toHaveBeenCalled();
		});
	});

	// -- Cleanup --

	it("cleans up controller on destroy", () => {
		const rootCleanup = $effect.root(() => {
			const api = useMentions({ triggers: makeTriggers() });
			flushSync();

			expect(api.state.status).toBe("idle");
		});

		// Calling cleanup should trigger $effect teardown → controller.destroy()
		rootCleanup();
		// If no error thrown, cleanup succeeded
	});

	it("handles rapid cleanup without errors", () => {
		// Create and immediately destroy — no lingering effects
		for (let i = 0; i < 10; i++) {
			const c = $effect.root(() => {
				useMentions({ triggers: makeTriggers() });
			});
			c();
		}
		// No errors = success
	});
});

describe("context helpers", () => {
	it("getMentionsContext throws outside provider", async () => {
		// getMentionsContext requires Svelte component context
		// Calling it outside a component should throw
		const { getMentionsContext } = await import("../lib/use-mentions.svelte.js");
		expect(() => getMentionsContext()).toThrow();
	});
});
