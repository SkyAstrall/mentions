import { describe, expect, it } from "vitest";
import { createInitialState, mentionReducer } from "./machine.ts";
import type { MentionAction, MentionState } from "./types.ts";

function reduce(state: MentionState, ...actions: MentionAction[]): MentionState {
	let s = state;
	for (const action of actions) {
		s = mentionReducer(s, action);
	}
	return s;
}

describe("mentionReducer", () => {
	const initial = createInitialState();

	// ---- INPUT_CHANGE --------------------------------------------------

	it("updates markup and plain text on INPUT_CHANGE", () => {
		const state = mentionReducer(initial, {
			type: "INPUT_CHANGE",
			markup: "hello",
			plainText: "hello",
			selectionStart: 5,
			selectionEnd: 5,
		});
		expect(state.markup).toBe("hello");
		expect(state.plainText).toBe("hello");
		expect(state.selectionStart).toBe(5);
		expect(state.selectionEnd).toBe(5);
		expect(state.status).toBe("idle");
	});

	// ---- TRIGGER_MATCH → suggesting ------------------------------------

	it("transitions idle → suggesting on TRIGGER_MATCH", () => {
		const state = mentionReducer(initial, {
			type: "TRIGGER_MATCH",
			trigger: "@",
			query: "jo",
			startIndex: 4,
			endIndex: 7,
		});
		expect(state.status).toBe("suggesting");
		expect(state.activeTrigger).toBe("@");
		expect(state.query).toBe("jo");
		expect(state.highlightedIndex).toBe(-1);
	});

	// ---- FETCH lifecycle ------------------------------------------------

	it("transitions to loading on FETCH_START", () => {
		const suggesting = mentionReducer(initial, {
			type: "TRIGGER_MATCH",
			trigger: "@",
			query: "jo",
			startIndex: 0,
			endIndex: 3,
		});
		const loading = mentionReducer(suggesting, { type: "FETCH_START" });
		expect(loading.status).toBe("loading");
	});

	it("transitions loading → suggesting on FETCH_COMPLETE with items", () => {
		const loading = reduce(
			initial,
			{ type: "TRIGGER_MATCH", trigger: "@", query: "jo", startIndex: 0, endIndex: 3 },
			{ type: "FETCH_START" },
		);
		const state = mentionReducer(loading, {
			type: "FETCH_COMPLETE",
			items: [{ id: "1", label: "John" }],
		});
		expect(state.status).toBe("suggesting");
		expect(state.items).toHaveLength(1);
		expect(state.highlightedIndex).toBe(-1);
	});

	it("transitions loading → idle on FETCH_ERROR", () => {
		const loading = reduce(
			initial,
			{ type: "TRIGGER_MATCH", trigger: "@", query: "jo", startIndex: 0, endIndex: 3 },
			{ type: "FETCH_START" },
		);
		const state = mentionReducer(loading, { type: "FETCH_ERROR" });
		expect(state.status).toBe("idle");
		expect(state.items).toEqual([]);
	});

	// ---- ARROW navigation -----------------------------------------------

	it("moves highlight down on ARROW_DOWN", () => {
		const suggesting = reduce(
			initial,
			{ type: "TRIGGER_MATCH", trigger: "@", query: "", startIndex: 0, endIndex: 1 },
			{ type: "FETCH_COMPLETE", items: [{ id: "1", label: "A" }, { id: "2", label: "B" }, { id: "3", label: "C" }] },
		);

		let state = mentionReducer(suggesting, { type: "ARROW_DOWN" });
		expect(state.status).toBe("navigating");
		expect(state.highlightedIndex).toBe(0);

		state = mentionReducer(state, { type: "ARROW_DOWN" });
		expect(state.highlightedIndex).toBe(1);

		state = mentionReducer(state, { type: "ARROW_DOWN" });
		expect(state.highlightedIndex).toBe(2);

		// Wraps around
		state = mentionReducer(state, { type: "ARROW_DOWN" });
		expect(state.highlightedIndex).toBe(0);
	});

	it("moves highlight up on ARROW_UP", () => {
		const suggesting = reduce(
			initial,
			{ type: "TRIGGER_MATCH", trigger: "@", query: "", startIndex: 0, endIndex: 1 },
			{ type: "FETCH_COMPLETE", items: [{ id: "1", label: "A" }, { id: "2", label: "B" }] },
		);

		// From -1, ARROW_UP should go to last item
		let state = mentionReducer(suggesting, { type: "ARROW_UP" });
		expect(state.highlightedIndex).toBe(1);

		state = mentionReducer(state, { type: "ARROW_UP" });
		expect(state.highlightedIndex).toBe(0);

		// Wraps to end
		state = mentionReducer(state, { type: "ARROW_UP" });
		expect(state.highlightedIndex).toBe(1);
	});

	it("does nothing on ARROW_DOWN with empty items", () => {
		const suggesting = reduce(
			initial,
			{ type: "TRIGGER_MATCH", trigger: "@", query: "", startIndex: 0, endIndex: 1 },
			{ type: "FETCH_COMPLETE", items: [] },
		);
		const state = mentionReducer(suggesting, { type: "ARROW_DOWN" });
		expect(state.highlightedIndex).toBe(-1);
	});

	// ---- SELECT ---------------------------------------------------------

	it("resets to idle on SELECT", () => {
		const navigating = reduce(
			initial,
			{ type: "TRIGGER_MATCH", trigger: "@", query: "jo", startIndex: 0, endIndex: 3 },
			{ type: "FETCH_COMPLETE", items: [{ id: "1", label: "John" }] },
			{ type: "ARROW_DOWN" },
		);
		const state = mentionReducer(navigating, {
			type: "SELECT",
			item: { id: "1", label: "John" },
		});
		expect(state.status).toBe("idle");
		expect(state.activeTrigger).toBeNull();
		expect(state.items).toEqual([]);
		expect(state.highlightedIndex).toBe(-1);
	});

	// ---- ESCAPE / BLUR --------------------------------------------------

	it("resets to idle on ESCAPE", () => {
		const suggesting = mentionReducer(initial, {
			type: "TRIGGER_MATCH",
			trigger: "@",
			query: "jo",
			startIndex: 0,
			endIndex: 3,
		});
		const state = mentionReducer(suggesting, { type: "ESCAPE" });
		expect(state.status).toBe("idle");
		expect(state.activeTrigger).toBeNull();
	});

	it("resets to idle on BLUR", () => {
		const suggesting = mentionReducer(initial, {
			type: "TRIGGER_MATCH",
			trigger: "@",
			query: "jo",
			startIndex: 0,
			endIndex: 3,
		});
		const state = mentionReducer(suggesting, { type: "BLUR" });
		expect(state.status).toBe("idle");
	});

	// ---- TRIGGER_LOST ---------------------------------------------------

	it("resets to idle on TRIGGER_LOST", () => {
		const suggesting = mentionReducer(initial, {
			type: "TRIGGER_MATCH",
			trigger: "@",
			query: "jo",
			startIndex: 0,
			endIndex: 3,
		});
		const state = mentionReducer(suggesting, { type: "TRIGGER_LOST" });
		expect(state.status).toBe("idle");
		expect(state.activeTrigger).toBeNull();
		expect(state.query).toBe("");
	});

	// ---- COMPOSITION ----------------------------------------------------

	it("sets isComposing on COMPOSITION_START/END", () => {
		const composing = mentionReducer(initial, { type: "COMPOSITION_START" });
		expect(composing.isComposing).toBe(true);

		const done = mentionReducer(composing, { type: "COMPOSITION_END" });
		expect(done.isComposing).toBe(false);
	});

	// ---- INSERT_COMPLETE ------------------------------------------------

	it("resets to idle and updates value on INSERT_COMPLETE", () => {
		const suggesting = reduce(
			initial,
			{ type: "TRIGGER_MATCH", trigger: "@", query: "jo", startIndex: 4, endIndex: 7 },
			{ type: "FETCH_COMPLETE", items: [{ id: "1", label: "John" }] },
			{ type: "ARROW_DOWN" },
		);
		expect(suggesting.status).toBe("navigating");

		const state = mentionReducer(suggesting, {
			type: "INSERT_COMPLETE",
			markup: "Hey @[John](1) ",
			plainText: "Hey @John ",
			cursor: 10,
		});
		expect(state.status).toBe("idle");
		expect(state.activeTrigger).toBeNull();
		expect(state.items).toEqual([]);
		expect(state.highlightedIndex).toBe(-1);
		expect(state.caretPosition).toBeNull();
		expect(state.markup).toBe("Hey @[John](1) ");
		expect(state.plainText).toBe("Hey @John ");
		expect(state.selectionStart).toBe(10);
	});

	// ---- CARET_POSITION -------------------------------------------------

	it("stores caret position", () => {
		const state = mentionReducer(initial, {
			type: "CARET_POSITION",
			position: { top: 42, left: 156, height: 20 },
		});
		expect(state.caretPosition).toEqual({ top: 42, left: 156, height: 20 });
	});

	// ---- QUERY_CHANGE ---------------------------------------------------

	it("resets highlight and updates query on QUERY_CHANGE", () => {
		const navigating = reduce(
			initial,
			{ type: "TRIGGER_MATCH", trigger: "@", query: "j", startIndex: 0, endIndex: 2 },
			{ type: "FETCH_COMPLETE", items: [{ id: "1", label: "John" }] },
			{ type: "ARROW_DOWN" },
		);
		expect(navigating.status).toBe("navigating");
		expect(navigating.highlightedIndex).toBe(0);

		const state = mentionReducer(navigating, {
			type: "QUERY_CHANGE",
			query: "jo",
			endIndex: 3,
		});
		expect(state.status).toBe("suggesting");
		expect(state.query).toBe("jo");
		expect(state.highlightedIndex).toBe(-1);
	});
});
