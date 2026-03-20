import { describe, expect, it } from "vitest";
import {
	applyChange,
	createMentionMarkup,
	extractMentions,
	insertMention,
	markupToPlainText,
	parseMarkup,
	plainIndexToMarkupIndex,
	toPlainText,
} from "./markup.ts";
import type { TriggerConfig } from "./types.ts";

const atTrigger: TriggerConfig = { char: "@", data: [] };
const hashTrigger: TriggerConfig = { char: "#", data: [] };
const triggers: TriggerConfig[] = [atTrigger, hashTrigger];

describe("parseMarkup", () => {
	it("returns empty array for empty string", () => {
		expect(parseMarkup("", triggers)).toEqual([]);
	});

	it("returns single text segment for plain text", () => {
		const result = parseMarkup("hello world", triggers);
		expect(result).toEqual([
			{ type: "text", text: "hello world", markupStart: 0, markupEnd: 11 },
		]);
	});

	it("parses a single @ mention", () => {
		const markup = "Hey @[John Doe](user:123) how are you";
		const result = parseMarkup(markup, triggers);

		expect(result).toHaveLength(3);
		expect(result[0]).toEqual({ type: "text", text: "Hey ", markupStart: 0, markupEnd: 4 });
		expect(result[1]).toEqual({ type: "mention", text: "@John Doe", id: "user:123", trigger: "@", markupStart: 4, markupEnd: 25 });
		expect(result[2]).toEqual({ type: "text", text: " how are you", markupStart: 25, markupEnd: 37 });
	});

	it("parses multiple mentions of different triggers", () => {
		const markup = "@[Alice](1) and #[urgent](2)";
		const result = parseMarkup(markup, triggers);

		expect(result).toHaveLength(3);
		expect(result[0]).toMatchObject({ type: "mention", text: "@Alice", id: "1", trigger: "@" });
		expect(result[1]).toMatchObject({ type: "text", text: " and " });
		expect(result[2]).toMatchObject({ type: "mention", text: "#urgent", id: "2", trigger: "#" });
	});

	it("parses consecutive mentions with no text between", () => {
		const result = parseMarkup("@[Alice](1)@[Bob](2)", triggers);
		expect(result).toHaveLength(2);
		expect(result[0]).toMatchObject({ type: "mention", text: "@Alice", id: "1" });
		expect(result[1]).toMatchObject({ type: "mention", text: "@Bob", id: "2" });
	});

	it("parses mention at start of string", () => {
		const result = parseMarkup("@[Alice](1) hello", triggers);
		expect(result[0]).toMatchObject({ type: "mention", text: "@Alice" });
		expect(result[1]).toMatchObject({ type: "text", text: " hello" });
	});

	it("parses mention at end of string", () => {
		const result = parseMarkup("hello @[Alice](1)", triggers);
		expect(result[0]).toMatchObject({ type: "text", text: "hello " });
		expect(result[1]).toMatchObject({ type: "mention", text: "@Alice" });
	});

	it("handles custom markup template", () => {
		const customTrigger: TriggerConfig = { char: "@", data: [], markup: "<<@__display__|__id__>>" };
		const result = parseMarkup("Hey <<@John|123>> there", [customTrigger]);
		expect(result).toHaveLength(3);
		expect(result[1]).toMatchObject({ type: "mention", text: "@John", id: "123" });
	});
});

describe("toPlainText", () => {
	it("concatenates all segment text values", () => {
		const segments = parseMarkup("Hey @[John](1) bye", triggers);
		expect(toPlainText(segments)).toBe("Hey @John bye");
	});
});

describe("markupToPlainText", () => {
	it("converts markup with single mention", () => {
		expect(markupToPlainText("Hello @[World](1)", triggers)).toBe("Hello @World");
	});

	it("converts markup with multiple mentions", () => {
		expect(markupToPlainText("@[Alice](1) and @[Bob](2) met #[today](3)", triggers)).toBe("@Alice and @Bob met #today");
	});

	it("returns plain text unchanged", () => {
		expect(markupToPlainText("no mentions here", triggers)).toBe("no mentions here");
	});

	it("handles empty string", () => {
		expect(markupToPlainText("", triggers)).toBe("");
	});
});

describe("plainIndexToMarkupIndex", () => {
	it("maps index in plain text before any mention", () => {
		const segments = parseMarkup("Hey @[John](1) bye", triggers);
		expect(plainIndexToMarkupIndex(segments, 2)).toBe(2);
	});

	it("maps index after a mention", () => {
		const segments = parseMarkup("Hey @[John](1) bye", triggers);
		expect(plainIndexToMarkupIndex(segments, 10)).toBe(15);
	});

	it("snaps to mention end when cursor is inside mention text", () => {
		const segments = parseMarkup("Hey @[John](1) bye", triggers);
		expect(plainIndexToMarkupIndex(segments, 5)).toBe(14);
	});

	it("returns markup length for index past end", () => {
		const segments = parseMarkup("Hi @[A](1)", triggers);
		expect(plainIndexToMarkupIndex(segments, 100)).toBe(10);
	});

	it("handles index 0 inside mention", () => {
		const segments = parseMarkup("@[Alice](1) hello", triggers);
		expect(plainIndexToMarkupIndex(segments, 0)).toBe(11);
	});
});

describe("createMentionMarkup", () => {
	it("creates default markup", () => {
		expect(createMentionMarkup({ id: "123", label: "John" }, atTrigger)).toBe("@[John](123)");
	});

	it("creates markup with custom template", () => {
		const trigger: TriggerConfig = { char: "#", data: [], markup: "#(__id__|__display__)" };
		expect(createMentionMarkup({ id: "tag:1", label: "urgent" }, trigger)).toBe("#(tag:1|urgent)");
	});
});

describe("insertMention", () => {
	it("inserts mention replacing trigger+query", () => {
		const result = insertMention("Hey @jo", { id: "123", label: "John Doe" }, atTrigger, 4, 7, triggers);
		expect(result.markup).toBe("Hey @[John Doe](123) ");
		expect(result.plainText).toBe("Hey @John Doe ");
		expect(result.cursor).toBe(14);
	});

	it("inserts mention at start of text", () => {
		const result = insertMention("@al", { id: "1", label: "Alice" }, atTrigger, 0, 3, triggers);
		expect(result.markup).toBe("@[Alice](1) ");
		expect(result.plainText).toBe("@Alice ");
		expect(result.cursor).toBe(7);
	});

	it("inserts mention preserving text after cursor", () => {
		const result = insertMention("Hello @jo world", { id: "2", label: "John" }, atTrigger, 6, 9, triggers);
		expect(result.markup).toBe("Hello @[John](2) world");
		expect(result.plainText).toBe("Hello @John world");
	});
});

describe("extractMentions", () => {
	it("returns empty array for no mentions", () => {
		expect(extractMentions("hello world", triggers)).toEqual([]);
	});

	it("extracts single mention", () => {
		expect(extractMentions("Hey @[John](123)", triggers)).toEqual([{ id: "123", label: "John" }]);
	});

	it("extracts multiple mentions of different triggers", () => {
		const result = extractMentions("@[Alice](1) #[urgent](2) @[Bob](3)", triggers);
		expect(result).toHaveLength(3);
		expect(result[0]).toEqual({ id: "1", label: "Alice" });
		expect(result[1]).toEqual({ id: "2", label: "urgent" });
		expect(result[2]).toEqual({ id: "3", label: "Bob" });
	});
});

describe("applyChange", () => {
	it("handles typing a single character", () => {
		expect(applyChange("hello", "hellox", "hello", triggers)).toBe("hellox");
	});

	it("handles deleting a character", () => {
		expect(applyChange("hello", "hell", "hello", triggers)).toBe("hell");
	});

	it("handles typing after a mention without breaking it", () => {
		expect(applyChange("Hey @[John](1) ", "Hey @John x", "Hey @John ", triggers)).toBe("Hey @[John](1) x");
	});

	it("removes entire mention when backspacing into it", () => {
		expect(applyChange("@[Alice Johnson](1) ", "@Alice Johnso ", "@Alice Johnson ", triggers)).toBe("@Alice Johnso ");
	});

	it("removes entire mention when deleting from middle", () => {
		expect(applyChange("Hey @[John](1) bye", "Hey @Jhn bye", "Hey @John bye", triggers)).toBe("Hey @Jhn bye");
	});

	it("handles typing before a mention without breaking it", () => {
		expect(applyChange("Hi @[John](1)", "Hi! @John", "Hi @John", triggers)).toBe("Hi! @[John](1)");
	});
});
