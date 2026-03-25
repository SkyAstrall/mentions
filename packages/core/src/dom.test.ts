// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
	buildMentionHTML,
	escapeHTML,
	getMarkupFromDOM,
	getPlainTextFromDOM,
	isExtensionNode,
} from "./dom.ts";
import type { TriggerConfig } from "./types.ts";

// --- escapeHTML ---

describe("escapeHTML", () => {
	it("escapes ampersand", () => {
		expect(escapeHTML("a&b")).toBe("a&amp;b");
	});

	it("escapes less-than", () => {
		expect(escapeHTML("a<b")).toBe("a&lt;b");
	});

	it("escapes greater-than", () => {
		expect(escapeHTML("a>b")).toBe("a&gt;b");
	});

	it("escapes double quotes", () => {
		expect(escapeHTML('a"b')).toBe("a&quot;b");
	});

	it("escapes single quotes", () => {
		expect(escapeHTML("a'b")).toBe("a&#39;b");
	});

	it("handles empty string", () => {
		expect(escapeHTML("")).toBe("");
	});

	it("handles string with no special characters", () => {
		expect(escapeHTML("hello world")).toBe("hello world");
	});

	it("escapes all special characters in one string", () => {
		expect(escapeHTML(`<div class="a" data-x='b'>&`)).toBe(
			"&lt;div class=&quot;a&quot; data-x=&#39;b&#39;&gt;&amp;",
		);
	});

	it("handles already-escaped input (double-escaping)", () => {
		expect(escapeHTML("&amp;")).toBe("&amp;amp;");
	});

	// XSS payload tests
	it("neutralizes script injection", () => {
		const result = escapeHTML("<script>alert(1)</script>");
		expect(result).toBe("&lt;script&gt;alert(1)&lt;/script&gt;");
		expect(result).not.toContain("<script>");
	});

	it("neutralizes img onerror injection", () => {
		const result = escapeHTML("<img src=x onerror=alert(1)>");
		expect(result).not.toContain("<img");
	});

	it("neutralizes attribute event handler injection", () => {
		const result = escapeHTML('" onmouseover="alert(1)');
		expect(result).not.toContain('"');
		expect(result).toContain("&quot;");
	});
});

// --- isExtensionNode ---

describe("isExtensionNode", () => {
	afterEach(() => {
		document.body.innerHTML = "";
	});

	it("returns false for text nodes", () => {
		const text = document.createTextNode("hello");
		expect(isExtensionNode(text)).toBe(false);
	});

	it("returns false for standard elements", () => {
		const div = document.createElement("div");
		expect(isExtensionNode(div)).toBe(false);
	});

	it("returns false for mark elements", () => {
		const mark = document.createElement("mark");
		expect(isExtensionNode(mark)).toBe(false);
	});

	it("detects custom elements (hyphenated tag names)", () => {
		const el = document.createElement("grammarly-extension");
		expect(isExtensionNode(el)).toBe(true);
	});

	it("detects custom elements with multiple hyphens", () => {
		const el = document.createElement("my-custom-element");
		expect(isExtensionNode(el)).toBe(true);
	});

	it("detects Grammarly shadow root attribute", () => {
		const div = document.createElement("div");
		div.setAttribute("data-grammarly-shadow-root", "true");
		expect(isExtensionNode(div)).toBe(true);
	});

	it("detects Grammarly class prefix", () => {
		const span = document.createElement("span");
		span.className = "gr_tooltip";
		expect(isExtensionNode(span)).toBe(true);
	});

	it("returns false for elements with classes not starting with gr_", () => {
		const span = document.createElement("span");
		span.className = "great-class";
		expect(isExtensionNode(span)).toBe(false);
	});
});

// --- getPlainTextFromDOM ---

describe("getPlainTextFromDOM", () => {
	afterEach(() => {
		document.body.innerHTML = "";
	});

	function div(html: string): HTMLElement {
		const el = document.createElement("div");
		el.innerHTML = html;
		document.body.appendChild(el);
		return el;
	}

	it("extracts plain text from text nodes", () => {
		expect(getPlainTextFromDOM(div("hello world"))).toBe("hello world");
	});

	it("strips zero-width spaces", () => {
		expect(getPlainTextFromDOM(div("hello\u200Bworld"))).toBe("helloworld");
	});

	it("extracts text content from mention marks", () => {
		const el = div('before <mark data-mention="@">@Alice</mark> after');
		expect(getPlainTextFromDOM(el)).toBe("before @Alice after");
	});

	it("converts BR tags to newlines", () => {
		const el = div("line1<br>line2");
		expect(getPlainTextFromDOM(el)).toBe("line1\nline2");
	});

	it("handles multiple mentions", () => {
		const el = div(
			'Hey <mark data-mention="@">@Alice</mark> and <mark data-mention="@">@Bob</mark>!',
		);
		expect(getPlainTextFromDOM(el)).toBe("Hey @Alice and @Bob!");
	});

	it("skips Grammarly extension nodes", () => {
		const el = div("hello <grammarly-extension>garbage</grammarly-extension> world");
		expect(getPlainTextFromDOM(el)).toBe("hello  world");
	});

	it("skips nodes with data-grammarly-shadow-root", () => {
		const el = div('hello <div data-grammarly-shadow-root="true">garbage</div> world');
		expect(getPlainTextFromDOM(el)).toBe("hello  world");
	});

	it("handles empty element", () => {
		expect(getPlainTextFromDOM(div(""))).toBe("");
	});

	it("handles nested spans (non-mention)", () => {
		const el = div("<span>nested <span>text</span></span>");
		expect(getPlainTextFromDOM(el)).toBe("nested text");
	});

	it("extracts full mention text including trigger", () => {
		const el = div('<mark data-mention="#">#urgent</mark>');
		expect(getPlainTextFromDOM(el)).toBe("#urgent");
	});
});

// --- getMarkupFromDOM ---

describe("getMarkupFromDOM", () => {
	const triggers: TriggerConfig[] = [
		{ char: "@", data: [] },
		{ char: "#", data: [] },
	];

	afterEach(() => {
		document.body.innerHTML = "";
	});

	function div(html: string): HTMLElement {
		const el = document.createElement("div");
		el.innerHTML = html;
		document.body.appendChild(el);
		return el;
	}

	it("reconstructs plain text as-is", () => {
		expect(getMarkupFromDOM(div("hello world"), triggers)).toBe("hello world");
	});

	it("reconstructs mention markup from DOM", () => {
		const el = div('<mark data-mention="@" data-id="123">@Alice</mark>');
		expect(getMarkupFromDOM(el, triggers)).toBe("@[Alice](123)");
	});

	it("reconstructs multiple mentions with surrounding text", () => {
		const el = div(
			'Hey <mark data-mention="@" data-id="1">@Alice</mark> and <mark data-mention="@" data-id="2">@Bob</mark>!',
		);
		expect(getMarkupFromDOM(el, triggers)).toBe("Hey @[Alice](1) and @[Bob](2)!");
	});

	it("reconstructs hashtag mentions", () => {
		const el = div('<mark data-mention="#" data-id="456">#urgent</mark>');
		expect(getMarkupFromDOM(el, triggers)).toBe("#[urgent](456)");
	});

	it("falls back to display text if trigger not in config", () => {
		const el = div('<mark data-mention="/" data-id="cmd">/deploy</mark>');
		expect(getMarkupFromDOM(el, triggers)).toBe("/deploy");
	});

	it("converts BR tags to newlines", () => {
		const el = div("line1<br>line2");
		expect(getMarkupFromDOM(el, triggers)).toBe("line1\nline2");
	});

	it("skips extension nodes", () => {
		const el = div("text <grammarly-extension>junk</grammarly-extension> more");
		expect(getMarkupFromDOM(el, triggers)).toBe("text  more");
	});

	it("strips zero-width spaces from text nodes", () => {
		const el = div("hello\u200B world");
		expect(getMarkupFromDOM(el, triggers)).toBe("hello world");
	});

	it("handles empty element", () => {
		expect(getMarkupFromDOM(div(""), triggers)).toBe("");
	});

	it("handles custom markup template", () => {
		const customTriggers: TriggerConfig[] = [
			{ char: "@", data: [], markup: "@[__display__](user:__id__)" },
		];
		const el = div('<mark data-mention="@" data-id="42">@Alice</mark>');
		expect(getMarkupFromDOM(el, customTriggers)).toBe("@[Alice](user:42)");
	});
});

// --- buildMentionHTML ---

describe("buildMentionHTML", () => {
	const triggers: TriggerConfig[] = [
		{ char: "@", data: [] },
		{ char: "#", data: [] },
	];

	it("returns plain text for markup with no mentions", () => {
		expect(buildMentionHTML("hello world", triggers)).toBe("hello world");
	});

	it("generates mark element for a mention", () => {
		const html = buildMentionHTML("@[Alice](123)", triggers);
		expect(html).toContain("<mark");
		expect(html).toContain('data-mention="@"');
		expect(html).toContain('data-id="123"');
		expect(html).toContain('contenteditable="false"');
		expect(html).toContain("@Alice");
		expect(html).toContain("\u200B");
	});

	it("generates correct HTML for multiple mentions", () => {
		const html = buildMentionHTML("Hey @[Alice](1) and @[Bob](2)!", triggers);
		expect(html).toContain('data-id="1"');
		expect(html).toContain('data-id="2"');
		expect(html).toContain("Hey ");
		expect(html).toContain(" and ");
		expect(html).toContain("!");
	});

	it("escapes HTML in display text", () => {
		const html = buildMentionHTML("@[<script>alert(1)</script>](xss)", triggers);
		expect(html).not.toContain("<script>");
		expect(html).toContain("&lt;script&gt;");
	});

	it("escapes HTML in trigger character", () => {
		const xssTriggers: TriggerConfig[] = [{ char: '">', data: [] }];
		const html = buildMentionHTML('">[test](id)', xssTriggers);
		// The trigger itself is escaped in the data-mention attribute
		expect(html).toContain("&quot;&gt;");
	});

	it("escapes HTML in mention ID attribute", () => {
		const html = buildMentionHTML('@[Alice](" onmouseover="alert(1))', triggers);
		// Quotes in the ID are escaped so they can't break out of the data-id attribute
		expect(html).toContain("&quot;");
		// The raw unescaped quote must not appear inside the attribute value
		expect(html).not.toContain('data-id="" ');
	});

	it("applies custom color from trigger config", () => {
		const colorTriggers: TriggerConfig[] = [{ char: "@", data: [], color: "#ff0000" }];
		const html = buildMentionHTML("@[Alice](1)", colorTriggers);
		expect(html).toContain("background-color:#ff0000");
	});

	it("uses CSS variable default when no color set", () => {
		const html = buildMentionHTML("@[Alice](1)", triggers);
		expect(html).toContain("var(--mention-bg");
	});

	it("handles empty markup string", () => {
		expect(buildMentionHTML("", triggers)).toBe("");
	});

	it("treats empty-label markup as plain text (parser does not match empty display)", () => {
		const html = buildMentionHTML("@[](1)", triggers);
		// Empty display text is not parsed as a mention — returned as escaped plain text
		expect(html).toBe("@[](1)");
	});

	it("plain text portions are HTML-escaped", () => {
		const html = buildMentionHTML("a < b & c > d", triggers);
		expect(html).toBe("a &lt; b &amp; c &gt; d");
	});
});
