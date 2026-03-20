import { describe, expect, it } from "vitest";
import { detectTrigger, type TriggerMatch } from "./triggers.ts";
import type { TriggerConfig } from "./types.ts";

const atTrigger: TriggerConfig = { char: "@", data: [] };
const hashTrigger: TriggerConfig = { char: "#", data: [] };
const slashTrigger: TriggerConfig = { char: "/", data: [] };
const doubleTrigger: TriggerConfig = { char: "@@", data: [] };
const spacesTrigger: TriggerConfig = { char: "@", data: [], allowSpaceInQuery: true };
const triggers: TriggerConfig[] = [atTrigger, hashTrigger, slashTrigger];

function expectMatch(result: TriggerMatch): NonNullable<TriggerMatch> {
	expect(result).not.toBeNull();
	return result as NonNullable<TriggerMatch>;
}

describe("detectTrigger", () => {
	it("detects @ trigger at start of text", () => {
		const r = expectMatch(detectTrigger("@jo", 3, triggers));
		expect(r.trigger.char).toBe("@");
		expect(r.query).toBe("jo");
		expect(r.startIndex).toBe(0);
		expect(r.endIndex).toBe(3);
	});

	it("detects @ trigger after space", () => {
		const r = expectMatch(detectTrigger("Hey @jo", 7, triggers));
		expect(r.trigger.char).toBe("@");
		expect(r.query).toBe("jo");
		expect(r.startIndex).toBe(4);
	});

	it("detects # trigger", () => {
		const r = expectMatch(detectTrigger("tag #urg", 8, triggers));
		expect(r.trigger.char).toBe("#");
		expect(r.query).toBe("urg");
	});

	it("detects / trigger", () => {
		const r = expectMatch(detectTrigger("/comm", 5, triggers));
		expect(r.trigger.char).toBe("/");
		expect(r.query).toBe("comm");
	});

	it("returns null when no trigger is present", () => {
		expect(detectTrigger("hello world", 11, triggers)).toBeNull();
	});

	it("returns null when trigger is mid-word (no preceding space)", () => {
		expect(detectTrigger("email@test", 10, triggers)).toBeNull();
	});

	it("detects trigger with empty query (just typed the char)", () => {
		const r = expectMatch(detectTrigger("Hey @", 5, triggers));
		expect(r.query).toBe("");
		expect(r.trigger.char).toBe("@");
	});

	it("closes trigger when space is typed (default: allowSpaceInQuery=false)", () => {
		expect(detectTrigger("Hey @john doe", 13, triggers)).toBeNull();
	});

	it("allows space in query when configured", () => {
		const r = expectMatch(detectTrigger("Hey @john doe", 13, [spacesTrigger]));
		expect(r.query).toBe("john doe");
	});

	it("detects trigger after newline", () => {
		const r = expectMatch(detectTrigger("line one\n@bob", 13, triggers));
		expect(r.trigger.char).toBe("@");
		expect(r.query).toBe("bob");
	});

	it("prefers longer trigger when ambiguous", () => {
		const r = expectMatch(detectTrigger("Hey @@query", 11, [atTrigger, doubleTrigger]));
		expect(r.trigger.char).toBe("@@");
		expect(r.query).toBe("query");
	});

	it("uses cursor position correctly (ignores text after cursor)", () => {
		const r = expectMatch(detectTrigger("Hey @jo world", 7, triggers));
		expect(r.query).toBe("jo");
	});

	it("detects trigger at cursor position 1 (just the trigger char)", () => {
		const r = expectMatch(detectTrigger("@", 1, triggers));
		expect(r.query).toBe("");
	});

	it("returns null for cursor at position 0", () => {
		expect(detectTrigger("@hello", 0, triggers)).toBeNull();
	});
});
