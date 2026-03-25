import { describe, expect, it } from "vitest";
import { connect } from "./connect.ts";
import { createInitialState } from "./machine.ts";
import type { MentionState } from "./types.ts";

function state(overrides?: Partial<MentionState>): MentionState {
	return createInitialState(overrides);
}

const ID = "test-1";

describe("connect", () => {
	describe("idle state", () => {
		const result = connect(state(), ID);

		it("sets role=combobox on input", () => {
			expect(result.inputProps.role).toBe("combobox");
		});

		it("sets aria-expanded=false when idle", () => {
			expect(result.inputProps["aria-expanded"]).toBe(false);
		});

		it("omits aria-controls when collapsed", () => {
			expect(result.inputProps["aria-controls"]).toBeUndefined();
		});

		it("sets aria-autocomplete=list", () => {
			expect(result.inputProps["aria-autocomplete"]).toBe("list");
		});

		it("omits aria-activedescendant when idle", () => {
			expect(result.inputProps["aria-activedescendant"]).toBeUndefined();
		});

		it("sets aria-haspopup=listbox", () => {
			expect(result.inputProps["aria-haspopup"]).toBe("listbox");
		});

		it("sets isOpen=false", () => {
			expect(result.isOpen).toBe(false);
		});

		it("sets isLoading=false", () => {
			expect(result.isLoading).toBe(false);
		});

		it("omits aria-busy on listbox", () => {
			expect(result.listProps["aria-busy"]).toBeUndefined();
		});
	});

	describe("suggesting state (open, no highlight)", () => {
		const items = [
			{ id: "1", label: "Alice" },
			{ id: "2", label: "Bob" },
		];
		const result = connect(
			state({
				status: "suggesting",
				activeTrigger: "@",
				query: "al",
				items,
				highlightedIndex: -1,
			}),
			ID,
		);

		it("sets aria-expanded=true", () => {
			expect(result.inputProps["aria-expanded"]).toBe(true);
		});

		it("sets aria-controls to listbox ID", () => {
			expect(result.inputProps["aria-controls"]).toBe(`mentions-listbox-${ID}`);
		});

		it("omits aria-activedescendant when no item highlighted", () => {
			expect(result.inputProps["aria-activedescendant"]).toBeUndefined();
		});

		it("sets isOpen=true", () => {
			expect(result.isOpen).toBe(true);
		});

		it("passes through query", () => {
			expect(result.query).toBe("al");
		});

		it("passes through items", () => {
			expect(result.items).toBe(items);
		});

		it("passes through activeTrigger", () => {
			expect(result.activeTrigger).toBe("@");
		});
	});

	describe("navigating state (highlighted option)", () => {
		const items = [
			{ id: "1", label: "Alice" },
			{ id: "2", label: "Bob" },
			{ id: "3", label: "Charlie" },
		];
		const result = connect(
			state({
				status: "navigating",
				activeTrigger: "@",
				query: "",
				items,
				highlightedIndex: 1,
			}),
			ID,
		);

		it("sets aria-activedescendant to highlighted item ID", () => {
			expect(result.inputProps["aria-activedescendant"]).toBe(`mention-item-${ID}-1`);
		});

		it("sets aria-expanded=true", () => {
			expect(result.inputProps["aria-expanded"]).toBe(true);
		});

		it("sets isOpen=true", () => {
			expect(result.isOpen).toBe(true);
		});

		it("passes through highlightedIndex", () => {
			expect(result.highlightedIndex).toBe(1);
		});
	});

	describe("loading state", () => {
		const result = connect(
			state({
				status: "loading",
				activeTrigger: "#",
				query: "tag",
			}),
			ID,
		);

		it("sets aria-expanded=true during loading", () => {
			expect(result.inputProps["aria-expanded"]).toBe(true);
		});

		it("sets aria-controls during loading", () => {
			expect(result.inputProps["aria-controls"]).toBe(`mentions-listbox-${ID}`);
		});

		it("sets aria-busy=true on listbox", () => {
			expect(result.listProps["aria-busy"]).toBe(true);
		});

		it("sets isLoading=true", () => {
			expect(result.isLoading).toBe(true);
		});

		it("sets isOpen=false (loading is not open)", () => {
			expect(result.isOpen).toBe(false);
		});

		it("omits aria-activedescendant during loading", () => {
			expect(result.inputProps["aria-activedescendant"]).toBeUndefined();
		});
	});

	describe("listbox props", () => {
		const result = connect(state(), ID);

		it("sets role=listbox", () => {
			expect(result.listProps.role).toBe("listbox");
		});

		it("sets id matching aria-controls pattern", () => {
			expect(result.listProps.id).toBe(`mentions-listbox-${ID}`);
		});

		it("sets aria-label", () => {
			expect(result.listProps["aria-label"]).toBe("Suggestions");
		});
	});

	describe("getItemProps", () => {
		const items = [
			{ id: "1", label: "Alice" },
			{ id: "2", label: "Bob" },
		];

		it("sets role=option on each item", () => {
			const result = connect(state({ status: "suggesting", items }), ID);
			expect(result.getItemProps(0).role).toBe("option");
			expect(result.getItemProps(1).role).toBe("option");
		});

		it("generates unique IDs per item", () => {
			const result = connect(state({ status: "suggesting", items }), ID);
			const id0 = result.getItemProps(0).id;
			const id1 = result.getItemProps(1).id;
			expect(id0).not.toBe(id1);
			expect(id0).toBe(`mention-item-${ID}-0`);
			expect(id1).toBe(`mention-item-${ID}-1`);
		});

		it("sets aria-selected=true only on highlighted item", () => {
			const result = connect(state({ status: "navigating", items, highlightedIndex: 0 }), ID);
			expect(result.getItemProps(0)["aria-selected"]).toBe(true);
			expect(result.getItemProps(1)["aria-selected"]).toBe(false);
		});

		it("sets aria-selected=false on all items when none highlighted", () => {
			const result = connect(state({ status: "suggesting", items, highlightedIndex: -1 }), ID);
			expect(result.getItemProps(0)["aria-selected"]).toBe(false);
			expect(result.getItemProps(1)["aria-selected"]).toBe(false);
		});

		it("moves aria-selected when highlightedIndex changes", () => {
			const r1 = connect(state({ status: "navigating", items, highlightedIndex: 0 }), ID);
			expect(r1.getItemProps(0)["aria-selected"]).toBe(true);
			expect(r1.getItemProps(1)["aria-selected"]).toBe(false);

			const r2 = connect(state({ status: "navigating", items, highlightedIndex: 1 }), ID);
			expect(r2.getItemProps(0)["aria-selected"]).toBe(false);
			expect(r2.getItemProps(1)["aria-selected"]).toBe(true);
		});
	});

	describe("ID consistency", () => {
		const items = [{ id: "1", label: "Alice" }];
		const result = connect(state({ status: "navigating", items, highlightedIndex: 0 }), ID);

		it("aria-controls on input matches listbox id", () => {
			expect(result.inputProps["aria-controls"]).toBe(result.listProps.id);
		});

		it("aria-activedescendant matches highlighted item id", () => {
			const activeId = result.inputProps["aria-activedescendant"];
			const itemId = result.getItemProps(0).id;
			expect(activeId).toBe(itemId);
		});
	});

	describe("caret position passthrough", () => {
		it("passes null when no caret position", () => {
			const result = connect(state(), ID);
			expect(result.caretPosition).toBeNull();
		});

		it("passes through caret position when set", () => {
			const pos = { top: 100, left: 200, height: 20 };
			const result = connect(state({ caretPosition: pos }), ID);
			expect(result.caretPosition).toBe(pos);
		});
	});

	describe("different instance IDs", () => {
		it("generates unique IDs for different instances", () => {
			const r1 = connect(state({ status: "suggesting" }), "a");
			const r2 = connect(state({ status: "suggesting" }), "b");
			expect(r1.listProps.id).not.toBe(r2.listProps.id);
			expect(r1.getItemProps(0).id).not.toBe(r2.getItemProps(0).id);
		});
	});
});
