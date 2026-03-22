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

	it("transitions to loading on FETCH_START from suggesting", () => {
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

	it("transitions loading → suggesting on FETCH_COMPLETE", () => {
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

	it("moves highlight down on ARROW_DOWN", () => {
		const suggesting = reduce(
			initial,
			{ type: "TRIGGER_MATCH", trigger: "@", query: "", startIndex: 0, endIndex: 1 },
			{
				type: "FETCH_COMPLETE",
				items: [
					{ id: "1", label: "A" },
					{ id: "2", label: "B" },
					{ id: "3", label: "C" },
				],
			},
		);

		let state = mentionReducer(suggesting, { type: "ARROW_DOWN" });
		expect(state.status).toBe("navigating");
		expect(state.highlightedIndex).toBe(0);

		state = mentionReducer(state, { type: "ARROW_DOWN" });
		expect(state.highlightedIndex).toBe(1);

		state = mentionReducer(state, { type: "ARROW_DOWN" });
		expect(state.highlightedIndex).toBe(2);

		state = mentionReducer(state, { type: "ARROW_DOWN" });
		expect(state.highlightedIndex).toBe(0);
	});

	it("moves highlight up on ARROW_UP", () => {
		const suggesting = reduce(
			initial,
			{ type: "TRIGGER_MATCH", trigger: "@", query: "", startIndex: 0, endIndex: 1 },
			{
				type: "FETCH_COMPLETE",
				items: [
					{ id: "1", label: "A" },
					{ id: "2", label: "B" },
				],
			},
		);

		let state = mentionReducer(suggesting, { type: "ARROW_UP" });
		expect(state.highlightedIndex).toBe(1);

		state = mentionReducer(state, { type: "ARROW_UP" });
		expect(state.highlightedIndex).toBe(0);

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

	it("HOME jumps to first item", () => {
		const navigating = reduce(
			initial,
			{ type: "TRIGGER_MATCH", trigger: "@", query: "", startIndex: 0, endIndex: 1 },
			{
				type: "FETCH_COMPLETE",
				items: [
					{ id: "1", label: "A" },
					{ id: "2", label: "B" },
					{ id: "3", label: "C" },
				],
			},
			{ type: "ARROW_DOWN" },
			{ type: "ARROW_DOWN" },
		);
		expect(navigating.highlightedIndex).toBe(1);

		const state = mentionReducer(navigating, { type: "HOME" });
		expect(state.highlightedIndex).toBe(0);
	});

	it("END jumps to last item", () => {
		const suggesting = reduce(
			initial,
			{ type: "TRIGGER_MATCH", trigger: "@", query: "", startIndex: 0, endIndex: 1 },
			{
				type: "FETCH_COMPLETE",
				items: [
					{ id: "1", label: "A" },
					{ id: "2", label: "B" },
					{ id: "3", label: "C" },
				],
			},
		);
		const state = mentionReducer(suggesting, { type: "END" });
		expect(state.highlightedIndex).toBe(2);
	});

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

	it("sets isComposing on COMPOSITION_START/END", () => {
		const composing = mentionReducer(initial, { type: "COMPOSITION_START" });
		expect(composing.isComposing).toBe(true);

		const done = mentionReducer(composing, { type: "COMPOSITION_END" });
		expect(done.isComposing).toBe(false);
	});

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

	it("stores caret position", () => {
		const state = mentionReducer(initial, {
			type: "CARET_POSITION",
			position: { top: 42, left: 156, height: 20 },
		});
		expect(state.caretPosition).toEqual({ top: 42, left: 156, height: 20 });
	});

	it("FETCH_COMPLETE is no-op in idle (prevents ghost popup after Escape)", () => {
		const state = mentionReducer(initial, {
			type: "FETCH_COMPLETE",
			items: [{ id: "1", label: "John" }],
		});
		expect(state).toBe(initial);
		expect(state.status).toBe("idle");
		expect(state.items).toEqual([]);
	});

	it("FETCH_START is no-op in idle", () => {
		const state = mentionReducer(initial, { type: "FETCH_START" });
		expect(state).toBe(initial);
	});

	it("FETCH_ERROR is no-op in idle", () => {
		const state = mentionReducer(initial, { type: "FETCH_ERROR" });
		expect(state).toBe(initial);
	});

	it("ARROW_DOWN is no-op in idle", () => {
		const state = mentionReducer(initial, { type: "ARROW_DOWN" });
		expect(state).toBe(initial);
	});

	it("ARROW_DOWN is no-op in loading", () => {
		const loading = reduce(
			initial,
			{ type: "TRIGGER_MATCH", trigger: "@", query: "jo", startIndex: 0, endIndex: 3 },
			{ type: "FETCH_START" },
		);
		const state = mentionReducer(loading, { type: "ARROW_DOWN" });
		expect(state).toBe(loading);
	});

	it("SELECT is no-op in idle", () => {
		const state = mentionReducer(initial, {
			type: "SELECT",
			item: { id: "1", label: "John" },
		});
		expect(state).toBe(initial);
	});

	it("ESCAPE is no-op in idle (returns same reference)", () => {
		const state = mentionReducer(initial, { type: "ESCAPE" });
		expect(state).toBe(initial);
	});

	it("BLUR is no-op in idle (returns same reference)", () => {
		const state = mentionReducer(initial, { type: "BLUR" });
		expect(state).toBe(initial);
	});

	it("FETCH_COMPLETE after ESCAPE stays idle (critical ghost popup prevention)", () => {
		const suggesting = mentionReducer(initial, {
			type: "TRIGGER_MATCH",
			trigger: "@",
			query: "jo",
			startIndex: 0,
			endIndex: 3,
		});
		const escaped = mentionReducer(suggesting, { type: "ESCAPE" });
		expect(escaped.status).toBe("idle");

		const afterFetch = mentionReducer(escaped, {
			type: "FETCH_COMPLETE",
			items: [{ id: "1", label: "John" }],
		});
		expect(afterFetch).toBe(escaped);
		expect(afterFetch.status).toBe("idle");
		expect(afterFetch.items).toEqual([]);
	});
});
