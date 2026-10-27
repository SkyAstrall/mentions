import { describe, expect, it } from "vitest";
import { detectTrigger, MAX_QUERY_LOOKBACK } from "./triggers.ts";
import type { TriggerConfig } from "./types.ts";

const lineTrigger: TriggerConfig = { char: "/", data: [], startOfLine: true };

function detect(text: string, trigger: TriggerConfig, cursor = text.length) {
	return detectTrigger(text, cursor, [trigger]);
}

describe("per-trigger opening options", () => {
	it.each([
		"/run",
		"\n/run",
		"intro\n/run",
		"intro\r\n/run",
	])("opens a line-start command in %j", (text) => {
		expect(detect(text, lineTrigger)).toEqual({
			trigger: lineTrigger,
			query: "run",
			startIndex: text.length - 4,
			endIndex: text.length,
		});
	});

	it.each([
		" /run",
		"\t/run",
		"intro /run",
		"intro./run",
		"\u4e2d/run",
		"intro\r/run",
		"intro\n /run",
	])("rejects a command outside a strict line start in %j", (text) => {
		expect(detect(text, lineTrigger)).toBeNull();
	});

	it("keeps the default behavior when startOfLine is false", () => {
		const trigger: TriggerConfig = { char: "/", data: [], startOfLine: false };
		expect(detect("intro /run", trigger)?.query).toBe("run");
	});

	it.each([
		"a",
		"/",
		"\\",
		"-",
		"[",
		"]",
		"^",
		".",
		"*",
		"?",
		"\u{1f600}",
	])("accepts the literal custom prefix %j even inside a word or path", (prefix) => {
		const trigger: TriggerConfig = { char: "@", data: [], allowedPrefixes: [prefix] };
		const text = `word${prefix}@al`;
		expect(detect(text, trigger)).toEqual({
			trigger,
			query: "al",
			startIndex: 4 + prefix.length,
			endIndex: text.length,
		});
	});

	it.each([
		" ",
		"\t",
		"\n",
		".",
		":",
		"\u4e2d",
		"a",
	])("replaces the default boundary rule and rejects unlisted prefix %j", (prefix) => {
		const trigger: TriggerConfig = { char: "@", data: [], allowedPrefixes: ["("] };
		expect(detect(`${prefix}@al`, trigger)).toBeNull();
	});

	it("allows text start with an explicit prefix list", () => {
		const trigger: TriggerConfig = { char: "@", data: [], allowedPrefixes: ["("] };
		expect(detect("@al", trigger)?.startIndex).toBe(0);
		expect(detect("(@al", trigger)?.startIndex).toBe(1);
	});

	it("treats an empty prefix list as text-start only", () => {
		const trigger: TriggerConfig = { char: "@", data: [], allowedPrefixes: [] };
		expect(detect("@al", trigger)?.query).toBe("al");
		for (const text of [" @al", "\n@al", "(@al", "\u4e2d@al"]) {
			expect(detect(text, trigger)).toBeNull();
		}
	});

	it("matches only the immediately preceding code point", () => {
		const trigger: TriggerConfig = { char: "@", data: [], allowedPrefixes: ["ab"] };
		expect(detect("ab@al", trigger)).toBeNull();
	});

	it("requires both restrictions when both are configured", () => {
		const newline: TriggerConfig = { ...lineTrigger, allowedPrefixes: ["\n", " "] };
		expect(detect("/run", newline)?.query).toBe("run");
		expect(detect("intro\n/run", newline)?.query).toBe("run");
		expect(detect("intro /run", newline)).toBeNull();
		const space: TriggerConfig = { ...lineTrigger, allowedPrefixes: [" "] };
		expect(detect("/run", space)?.query).toBe("run");
		expect(detect("intro\n/run", space)).toBeNull();
		expect(detect("intro /run", space)).toBeNull();
	});

	it("applies options independently to each trigger", () => {
		const mention: TriggerConfig = { char: "@", data: [] };
		const triggers = [lineTrigger, mention];
		expect(detectTrigger("intro /run", 10, triggers)).toBeNull();
		expect(detectTrigger("intro @al", 9, triggers)?.trigger).toBe(mention);
	});

	it("checks the prefix before the complete multi-character trigger", () => {
		const trigger: TriggerConfig = { char: "::", data: [], allowedPrefixes: ["a"] };
		expect(detect("a::al", trigger)).toEqual({
			trigger,
			query: "al",
			startIndex: 1,
			endIndex: 5,
		});
		const line: TriggerConfig = { char: "::", data: [], startOfLine: true };
		expect(detect("\n::al", line)?.startIndex).toBe(1);
		expect(detect(" ::al", line)).toBeNull();
	});

	it("preserves cursor, minChars, query-space, newline, and lookback constraints", () => {
		expect(detect("/run tail", lineTrigger, 4)?.query).toBe("run");
		const trigger: TriggerConfig = { ...lineTrigger, minChars: 3, allowSpaceInQuery: true };
		expect(detect("\n/ru", trigger)).toBeNull();
		expect(detect("\n/run now", trigger)?.query).toBe("run now");
		expect(detect("\n/run\nnow", trigger)).toBeNull();
		expect(detect(`/` + "a".repeat(MAX_QUERY_LOOKBACK + 10), trigger)).toBeNull();
	});
});

describe("default boundary compatibility", () => {
	const defaults: TriggerConfig[] = [
		{ char: "@", data: [] },
		{ char: "@", data: [], startOfLine: false, allowedPrefixes: undefined },
	];

	it.each([
		"",
		" ",
		"\t",
		"\n",
		".",
		"?",
		":",
		"(",
		"\u3002",
		"\u4e2d",
		"\u3042",
		"\u30a2",
		"\ud55c",
		"\u3105",
		"\u{20000}",
	])("retains the default accepted boundary %j", (prefix) => {
		for (const trigger of defaults) {
			expect(detect(`${prefix}@al`, trigger)?.startIndex).toBe(prefix.length);
		}
	});

	it.each([
		"a",
		"1",
		"_",
		"\u0301",
		..."/-#&=+~@\\",
	])("retains suppression after a word continuation or joiner %j", (prefix) => {
		for (const trigger of defaults) {
			expect(detect(`word${prefix}@al`, trigger)).toBeNull();
		}
	});
});
