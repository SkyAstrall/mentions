import { describe, expect, it } from "vitest";
import { connect } from "./connect.ts";
import { MentionController } from "./controller.ts";
import { detectTrigger } from "./triggers.ts";
import type { TriggerConfig } from "./types.ts";

const atTrigger: TriggerConfig = { char: "@", data: [] };
const cjkPrefixes = ["你好", "かな", "カナー", "한글", "ㄅ", "\u{20000}"];
const punctuationPrefixes = [
	"(",
	"[",
	"{",
	",",
	".",
	"!",
	"?",
	":",
	";",
	"，",
	"。",
	"（",
	"「",
	"—",
];
const emailTexts = [
	"name@example.com",
	"first.last@example.com",
	"first_last@example.com",
	"name+tag@example.com",
	"user123@example.com",
];

function expectDetection(prefix: string, char: string, query: string): void {
	const trigger: TriggerConfig = { char, data: [] };
	const text = `${prefix}${char}${query}`;
	expect(detectTrigger(text, text.length, [trigger])).toEqual({
		trigger,
		query,
		startIndex: prefix.length,
		endIndex: text.length,
	});
}

describe("trigger boundaries for issue 2", () => {
	it.each([...cjkPrefixes, ...punctuationPrefixes])("detects triggers after %s", (prefix) => {
		for (const char of ["@", "#", "/", "::"]) {
			for (const query of ["", "al"]) {
				expectDetection(prefix, char, query);
			}
		}
	});

	it.each(emailTexts)("does not activate within %s while typing", (text) => {
		for (let cursor = text.indexOf("@") + 1; cursor <= text.length; cursor++) {
			expect(detectTrigger(text, cursor, [atTrigger])).toBeNull();
		}
	});

	it.each([
		"hello",
		"café",
		"имя",
		"123",
		"name_",
		"e\u0301",
		"\u{10400}",
	])("retains word-adjacent suppression after %s", (prefix) => {
		const text = `${prefix}@al`;
		expect(detectTrigger(text, text.length, [atTrigger])).toBeNull();
	});

	it("preserves longest-trigger precedence after CJK", () => {
		const doubleTrigger: TriggerConfig = { char: "@@", data: [] };
		const text = "你好@@al";
		expect(detectTrigger(text, text.length, [atTrigger, doubleTrigger])).toEqual({
			trigger: doubleTrigger,
			query: "al",
			startIndex: 2,
			endIndex: text.length,
		});
	});

	it("uses UTF-16 cursor offsets and ignores following text", () => {
		const prefix = "\u{20000}";
		const beforeCursor = `${prefix}@al`;
		const text = `${beforeCursor} later`;
		expect(detectTrigger(text, beforeCursor.length, [atTrigger])).toEqual({
			trigger: atTrigger,
			query: "al",
			startIndex: prefix.length,
			endIndex: beforeCursor.length,
		});
	});

	it("preserves minChars after a newly accepted boundary", () => {
		const trigger: TriggerConfig = { ...atTrigger, minChars: 2 };
		expect(detectTrigger("你好@a", 4, [trigger])).toBeNull();
		expect(detectTrigger("你好@al", 5, [trigger])?.query).toBe("al");
	});

	it("preserves query whitespace options after punctuation", () => {
		const text = "(@Alice Smith";
		expect(detectTrigger(text, text.length, [atTrigger])).toBeNull();
		const trigger: TriggerConfig = { ...atTrigger, allowSpaceInQuery: true };
		expect(detectTrigger(text, text.length, [trigger])).toEqual({
			trigger,
			query: "Alice Smith",
			startIndex: 1,
			endIndex: text.length,
		});
	});
});

describe("suggestion state for issue 2", () => {
	it.each([
		"你好@",
		"你好@al",
		"（@al",
		"\u{20000}@al",
	])("opens filtered suggestions for %s and closes for an email", (text) => {
		const alice = { id: "1", label: "Alice" };
		const controller = new MentionController({
			triggers: [{ char: "@", data: [alice] }],
		});
		try {
			controller.handleInputChange(text, text, text.length);
			const state = controller.getState();
			expect(state.status).toBe("suggesting");
			expect(state.activeTrigger).toBe("@");
			expect(state.query).toBe(text.slice(text.indexOf("@") + 1));
			expect(state.items).toEqual([alice]);
			const opened = connect(state, "issue-2");
			expect(opened.isOpen).toBe(true);
			expect(opened.inputProps["aria-expanded"]).toBe(true);

			const email = "name@example.com";
			controller.handleInputChange(email, email, email.length);
			const closedState = controller.getState();
			expect(closedState.status).toBe("idle");
			expect(closedState.activeTrigger).toBeNull();
			expect(closedState.items).toEqual([]);
			const closed = connect(closedState, "issue-2");
			expect(closed.isOpen).toBe(false);
			expect(closed.inputProps["aria-expanded"]).toBe(false);
		} finally {
			controller.destroy();
		}
	});
});
