import { describe, expect, it } from "vitest";
import { detectTrigger } from "./triggers.ts";
import type { TriggerConfig } from "./types.ts";

const atTrigger: TriggerConfig = { char: "@", data: [] };
const hashTrigger: TriggerConfig = { char: "#", data: [] };
const slashTrigger: TriggerConfig = { char: "/", data: [] };
const doubleTrigger: TriggerConfig = { char: "@@", data: [] };
const spacesTrigger: TriggerConfig = { char: "@", data: [], allowSpaceInQuery: true };
const triggers: TriggerConfig[] = [atTrigger, hashTrigger, slashTrigger];

describe("detectTrigger", () => {
	it("detects @ trigger at start of text", () => {
		const result = detectTrigger("@jo", 3, triggers);
		expect(result).not.toBeNull();
		expect(result!.trigger.char).toBe("@");
		expect(result!.query).toBe("jo");
		expect(result!.startIndex).toBe(0);
		expect(result!.endIndex).toBe(3);
	});

	it("detects @ trigger after space", () => {
		const result = detectTrigger("Hey @jo", 7, triggers);
		expect(result).not.toBeNull();
		expect(result!.trigger.char).toBe("@");
		expect(result!.query).toBe("jo");
		expect(result!.startIndex).toBe(4);
	});

	it("detects # trigger", () => {
		const result = detectTrigger("tag #urg", 8, triggers);
		expect(result).not.toBeNull();
		expect(result!.trigger.char).toBe("#");
		expect(result!.query).toBe("urg");
	});

	it("detects / trigger", () => {
		const result = detectTrigger("/comm", 5, triggers);
		expect(result).not.toBeNull();
		expect(result!.trigger.char).toBe("/");
		expect(result!.query).toBe("comm");
	});

	it("returns null when no trigger is present", () => {
		const result = detectTrigger("hello world", 11, triggers);
		expect(result).toBeNull();
	});

	it("returns null when trigger is mid-word (no preceding space)", () => {
		const result = detectTrigger("email@test", 10, triggers);
		expect(result).toBeNull();
	});

	it("detects trigger with empty query (just typed the char)", () => {
		const result = detectTrigger("Hey @", 5, triggers);
		expect(result).not.toBeNull();
		expect(result!.query).toBe("");
		expect(result!.trigger.char).toBe("@");
	});

	it("closes trigger when space is typed (default: allowSpaceInQuery=false)", () => {
		const result = detectTrigger("Hey @john doe", 13, triggers);
		// "doe" doesn't match because space breaks the query
		// But " @john doe" — the regex should NOT match because of the space in query
		expect(result).toBeNull();
	});

	it("allows space in query when configured", () => {
		const result = detectTrigger("Hey @john doe", 13, [spacesTrigger]);
		expect(result).not.toBeNull();
		expect(result!.query).toBe("john doe");
	});

	it("detects trigger after newline", () => {
		const result = detectTrigger("line one\n@bob", 13, triggers);
		expect(result).not.toBeNull();
		expect(result!.trigger.char).toBe("@");
		expect(result!.query).toBe("bob");
	});

	it("prefers longer trigger when ambiguous", () => {
		// "@@query" should match @@ not @
		const result = detectTrigger("Hey @@query", 11, [atTrigger, doubleTrigger]);
		expect(result).not.toBeNull();
		expect(result!.trigger.char).toBe("@@");
		expect(result!.query).toBe("query");
	});

	it("uses cursor position correctly (ignores text after cursor)", () => {
		// Text: "Hey @jo world" but cursor is at position 7
		const result = detectTrigger("Hey @jo world", 7, triggers);
		expect(result).not.toBeNull();
		expect(result!.query).toBe("jo");
	});

	it("detects trigger at cursor position 1 (just the trigger char)", () => {
		const result = detectTrigger("@", 1, triggers);
		expect(result).not.toBeNull();
		expect(result!.query).toBe("");
	});

	it("returns null for cursor at position 0", () => {
		const result = detectTrigger("@hello", 0, triggers);
		expect(result).toBeNull();
	});
});
