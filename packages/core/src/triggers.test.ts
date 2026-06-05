import { describe, expect, it } from "vitest";
import { detectTrigger, MAX_QUERY_LOOKBACK, type TriggerMatch } from "./triggers.ts";
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

describe("bounded backward scan", () => {
	const at: TriggerConfig[] = [{ char: "@", data: [] }];

	it("finds a trigger immediately after a whitespace boundary", () => {
		const text = "some earlier words @ali";
		expect(detectTrigger(text, text.length, at)?.query).toBe("ali");
	});

	it("ignores trigger characters buried in earlier words", () => {
		const text = "email user@example.com then more text";
		expect(detectTrigger(text, text.length, at)).toBeNull();
	});

	it("does not let a space-allowing query cross a newline", () => {
		const spaced: TriggerConfig[] = [{ char: "@", data: [], allowSpaceInQuery: true }];
		const text = "@john smith\nsecond line";
		expect(detectTrigger(text, text.length, spaced)).toBeNull();
	});

	it("allows spaces in query within a single line", () => {
		const spaced: TriggerConfig[] = [{ char: "@", data: [], allowSpaceInQuery: true }];
		const text = "@john smith";
		expect(detectTrigger(text, text.length, spaced)?.query).toBe("john smith");
	});

	it("gives up beyond MAX_QUERY_LOOKBACK instead of scanning the whole document", () => {
		const text = `@${"a".repeat(MAX_QUERY_LOOKBACK + 10)}`;
		expect(detectTrigger(text, text.length, at)).toBeNull();
	});

	it("matches a query close to the lookback limit", () => {
		const query = "a".repeat(MAX_QUERY_LOOKBACK - 2);
		const text = `@${query}`;
		expect(detectTrigger(text, text.length, at)?.query).toBe(query);
	});

	it("stays fast with a trigger-dense large document", () => {
		const text = `${"reply user@host.com @Component and more ".repeat(5000)}@que`;
		const start = performance.now();
		const match = detectTrigger(text, text.length, at);
		const elapsed = performance.now() - start;
		expect(match?.query).toBe("que");
		expect(elapsed).toBeLessThan(5);
	});
});
