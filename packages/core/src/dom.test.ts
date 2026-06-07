// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	buildMentionHTML,
	escapeHTML,
	getCursorOffset,
	getMarkupFromDOM,
	getPlainTextFromDOM,
	handleEditorPaste,
	insertLargeText,
	isExtensionNode,
	isLargePaste,
	LARGE_PASTE_CHARS,
	LARGE_PASTE_LINES,
	readEditorState,
	undoLargePaste,
} from "./dom.ts";
import type { TriggerConfig } from "./types.ts";

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
		expect(html).toBe("@[](1)");
	});

	it("plain text portions are HTML-escaped", () => {
		const html = buildMentionHTML("a < b & c > d", triggers);
		expect(html).toBe("a &lt; b &amp; c &gt; d");
	});
});

describe("block-element line breaks", () => {
	const triggers: TriggerConfig[] = [{ char: "@", data: [] }];

	function editorWith(html: string): HTMLElement {
		const el = document.createElement("div");
		el.innerHTML = html;
		return el;
	}

	it("emits newline between sibling blocks (Chrome typed-Enter shape)", () => {
		const el = editorWith("a<div>b</div>");
		expect(getPlainTextFromDOM(el)).toBe("a\nb");
		expect(getMarkupFromDOM(el, triggers)).toBe("a\nb");
	});

	it("emits newline between leading block and following block", () => {
		const el = editorWith("<div>a</div><div>b</div>");
		expect(getPlainTextFromDOM(el)).toBe("a\nb");
	});

	it("treats sole <br> in a block as an empty-line placeholder", () => {
		const el = editorWith("a<div><br></div>");
		expect(getPlainTextFromDOM(el)).toBe("a\n");
	});

	it("preserves empty line between content lines (Chrome double-Enter shape)", () => {
		const el = editorWith("a<div><br></div><div>b</div>");
		expect(getPlainTextFromDOM(el)).toBe("a\n\nb");
	});

	it("still emits newline for inline <br> with siblings", () => {
		const el = editorWith("<div>a<br>b</div>");
		expect(getPlainTextFromDOM(el)).toBe("a\nb");
	});

	it("serializes empty editor with placeholder <br> as empty string", () => {
		const el = editorWith("<br>");
		expect(getPlainTextFromDOM(el)).toBe("");
	});

	it("extracts mentions from inside block lines", () => {
		const el = editorWith('a<div><mark data-mention="@" data-id="1">@Alice</mark> hi</div>');
		expect(getPlainTextFromDOM(el)).toBe("a\n@Alice hi");
		expect(getMarkupFromDOM(el, triggers)).toBe("a\n@[Alice](1) hi");
	});

	it("handles nested blocks without double newlines", () => {
		const el = editorWith("<div><div>a</div></div><div>b</div>");
		expect(getPlainTextFromDOM(el)).toBe("a\nb");
	});

	it("preserves a leading empty line before content (Chrome Enter-at-top shape)", () => {
		const el = editorWith("<div><br></div><div>b</div>");
		expect(getPlainTextFromDOM(el)).toBe("\nb");
		expect(getMarkupFromDOM(el, triggers)).toBe("\nb");
	});

	it("preserves multiple leading empty lines", () => {
		const el = editorWith("<div><br></div><div><br></div><div>b</div>");
		expect(getPlainTextFromDOM(el)).toBe("\n\nb");
	});

	it("does not treat an extension node as a preceding line", () => {
		const el = editorWith("<grammarly-extension></grammarly-extension><div>b</div>");
		expect(getPlainTextFromDOM(el)).toBe("b");
	});
});

describe("readEditorState", () => {
	const triggers: TriggerConfig[] = [{ char: "@", data: [] }];

	it("matches separate markup and plain-text reads", () => {
		const el = document.createElement("div");
		el.innerHTML = 'x <mark data-mention="@" data-id="7">@Bob</mark>\u200B y<div>z</div>';
		const { markup, plainText } = readEditorState(el, triggers);
		expect(markup).toBe(getMarkupFromDOM(el, triggers));
		expect(plainText).toBe(getPlainTextFromDOM(el));
		expect(markup).toBe("x @[Bob](7) y\nz");
		expect(plainText).toBe("x @Bob y\nz");
	});
});

describe("getCursorOffset (walker-based)", () => {
	function place(el: HTMLElement, container: Node, offset: number) {
		document.body.appendChild(el);
		const range = document.createRange();
		range.setStart(container, offset);
		range.collapse(true);
		const sel = window.getSelection();
		sel?.removeAllRanges();
		sel?.addRange(range);
	}

	afterEach(() => {
		document.body.innerHTML = "";
		window.getSelection()?.removeAllRanges();
	});

	it("counts offset within a single text node", () => {
		const el = document.createElement("div");
		el.textContent = "hello";
		place(el, el.firstChild as Node, 3);
		expect(getCursorOffset(el)).toBe(3);
	});

	it("counts block newline when caret is on the second line", () => {
		const el = document.createElement("div");
		el.innerHTML = "a<div>b</div>";
		const second = el.querySelector("div")?.firstChild as Node;
		place(el, second, 1);
		// "a" + "\n" + "b" → caret after b = 3
		expect(getCursorOffset(el)).toBe(3);
	});

	it("counts a leading empty line in the offset", () => {
		const el = document.createElement("div");
		el.innerHTML = "<div><br></div><div>b</div>";
		const second = el.querySelectorAll("div")[1]?.firstChild as Node;
		place(el, second, 1);
		// leading "\n" + "b" → caret after b = 2
		expect(getCursorOffset(el)).toBe(2);
	});

	it("skips zero-width spaces before the caret", () => {
		const el = document.createElement("div");
		el.textContent = "a\u200Bb";
		place(el, el.firstChild as Node, 3);
		expect(getCursorOffset(el)).toBe(2);
	});

	it("resolves element-container caret at end of editor", () => {
		const el = document.createElement("div");
		el.innerHTML = "ab";
		place(el, el, el.childNodes.length);
		expect(getCursorOffset(el)).toBe(2);
	});

	it("returns 0 when selection is outside the editor", () => {
		const el = document.createElement("div");
		el.textContent = "abc";
		document.body.appendChild(el);
		const other = document.createElement("div");
		other.textContent = "xyz";
		document.body.appendChild(other);
		const range = document.createRange();
		range.setStart(other.firstChild as Node, 1);
		const sel = window.getSelection();
		sel?.removeAllRanges();
		sel?.addRange(range);
		expect(getCursorOffset(el)).toBe(0);
	});
});

describe("isLargePaste", () => {
	it("accepts small pastes", () => {
		expect(isLargePaste("hello\nworld")).toBe(false);
	});

	it("flags pastes above the line threshold", () => {
		expect(isLargePaste("x\n".repeat(LARGE_PASTE_LINES + 1))).toBe(true);
	});

	it("flags pastes above the char threshold", () => {
		expect(isLargePaste("x".repeat(LARGE_PASTE_CHARS + 1))).toBe(true);
	});

	it("accepts pastes at exactly the line threshold", () => {
		expect(isLargePaste("x\n".repeat(LARGE_PASTE_LINES - 1))).toBe(false);
	});
});

describe("trailing newline representation", () => {
	it("serializes a trailing <br> as the final newline", () => {
		const el = document.createElement("div");
		el.innerHTML = "x<br>";
		expect(getPlainTextFromDOM(el)).toBe("x\n");
	});

	it("round-trips markup with a trailing newline through buildMentionHTML", () => {
		const triggers: TriggerConfig[] = [{ char: "@", data: [] }];
		const html = buildMentionHTML("a\nb\n", triggers);
		expect(html).toBe("a\nb<div><br></div>");
		const el = document.createElement("div");
		el.innerHTML = html;
		expect(getPlainTextFromDOM(el)).toBe("a\nb\n");
		expect(getMarkupFromDOM(el, triggers)).toBe("a\nb\n");
	});
});

describe("large paste undo machinery", () => {
	function selectAll(el: HTMLElement) {
		document.body.appendChild(el);
		el.focus?.();
		const range = document.createRange();
		range.selectNodeContents(el);
		range.collapse(false);
		const sel = window.getSelection();
		sel?.removeAllRanges();
		sel?.addRange(range);
	}

	afterEach(() => {
		document.body.innerHTML = "";
		window.getSelection()?.removeAllRanges();
	});

	it("snapshots before insert and restores on historyUndo", () => {
		const el = document.createElement("div");
		el.textContent = "before";
		selectAll(el);

		insertLargeText(el, "x".repeat(LARGE_PASTE_CHARS + 1));
		expect(el.textContent).toContain("x");

		const undone = undoLargePaste(el);
		expect(undone).toBe(true);
		expect(el.textContent).toBe("before");
	});

	it("invalidates the snapshot after a real user edit", () => {
		const el = document.createElement("div");
		el.textContent = "before";
		selectAll(el);
		insertLargeText(el, "x".repeat(LARGE_PASTE_CHARS + 1));

		// A genuine edit (any non-synthetic inputType) clears the snapshot.
		el.dispatchEvent(new InputEvent("input", { inputType: "insertText", bubbles: true }));
		expect(undoLargePaste(el)).toBe(false);
	});

	it("ignores its own synthetic input event", () => {
		const el = document.createElement("div");
		el.textContent = "before";
		selectAll(el);
		// insertLargeText dispatches inputType=insertFromPaste; if that invalidated
		// the snapshot, the immediately-following undo would fail.
		insertLargeText(el, "x".repeat(LARGE_PASTE_CHARS + 1));
		expect(undoLargePaste(el)).toBe(true);
	});

	it("attaches undo listeners only once across repeated pastes", () => {
		const el = document.createElement("div");
		el.textContent = "a";
		selectAll(el);
		const spy = vi.spyOn(el, "addEventListener");
		insertLargeText(el, "y".repeat(LARGE_PASTE_CHARS + 1));
		insertLargeText(el, "z".repeat(LARGE_PASTE_CHARS + 1));
		const beforeInputAdds = spy.mock.calls.filter((c) => c[0] === "beforeinput").length;
		expect(beforeInputAdds).toBe(1);
		spy.mockRestore();
	});
});

describe("handleEditorPaste routing", () => {
	function clipboardEvent(text: string): ClipboardEvent {
		// jsdom has no DataTransfer; stub the only surface handleEditorPaste reads.
		const e = new Event("paste", { cancelable: true, bubbles: true }) as ClipboardEvent;
		Object.defineProperty(e, "clipboardData", {
			value: { getData: (type: string) => (type === "text/plain" ? text : "") },
		});
		return e;
	}

	function editorWithCaret(): HTMLElement {
		const el = document.createElement("div");
		el.textContent = "";
		document.body.appendChild(el);
		const range = document.createRange();
		range.selectNodeContents(el);
		range.collapse(false);
		const sel = window.getSelection();
		sel?.removeAllRanges();
		sel?.addRange(range);
		return el;
	}

	beforeEach(() => {
		// jsdom lacks execCommand; force insertTextAtCursor onto its manual fallback.
		(document as unknown as { execCommand?: () => boolean }).execCommand = () => false;
	});

	afterEach(() => {
		document.body.innerHTML = "";
		window.getSelection()?.removeAllRanges();
		(document as unknown as { execCommand?: unknown }).execCommand = undefined;
	});

	it("takes the large path for a single-line editor pasting a huge single line", () => {
		const el = editorWithCaret();
		const handled = handleEditorPaste(clipboardEvent("a".repeat(LARGE_PASTE_CHARS + 1)), el, {
			singleLine: true,
		});
		expect(handled).toBe(true);
		expect(el.querySelectorAll("div").length).toBe(0);
		expect((el.textContent ?? "").length).toBeGreaterThan(LARGE_PASTE_CHARS);
	});

	it("lets a small paste fall through to native in plaintext-only mode", () => {
		const el = editorWithCaret();
		const handled = handleEditorPaste(clipboardEvent("hello"), el, { plaintextOnly: true });
		expect(handled).toBe(false);
	});

	it("flattens newlines for single-line small pastes", () => {
		const el = editorWithCaret();
		const handled = handleEditorPaste(clipboardEvent("a\nb\nc"), el, { singleLine: true });
		expect(handled).toBe(true);
		expect(el.textContent).not.toContain("\n");
	});
});
