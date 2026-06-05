import { createMentionMarkup, parseMarkup } from "./markup.ts";
import type { CaretPosition, MachineStatus, TriggerConfig } from "./types.ts";

const HTML_ESCAPES: Record<string, string> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#39;",
};

/** Escape HTML special characters for safe innerHTML insertion. */
export function escapeHTML(str: string): string {
	return str.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

/** Detect browser extension nodes (Grammarly, custom elements) to skip during DOM walks. */
export function isExtensionNode(node: Node): boolean {
	if (node.nodeType !== Node.ELEMENT_NODE) return false;
	const el = node as HTMLElement;
	const tag = el.tagName.toLowerCase();
	if (tag.includes("-")) return true;
	if (el.hasAttribute("data-grammarly-shadow-root")) return true;
	if (el.className && typeof el.className === "string" && el.className.startsWith("gr_"))
		return true;
	return false;
}

/**
 * Elements that start a new visual line in a contenteditable.
 *
 * Chrome represents Enter and multi-line inserts as `<div>` blocks even in
 * plaintext-only mode, so serialization must emit `\n` at block boundaries
 * or user line breaks are silently dropped.
 */
const BLOCK_TAGS = new Set([
	"DIV",
	"P",
	"H1",
	"H2",
	"H3",
	"H4",
	"H5",
	"H6",
	"LI",
	"PRE",
	"BLOCKQUOTE",
	"SECTION",
	"ARTICLE",
]);

function isBlockElement(node: Node): boolean {
	return node.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.has((node as HTMLElement).tagName);
}

/**
 * A block element opens a new line only when something precedes it; the first
 * line in the editor carries no leading break. Extension-injected nodes
 * (Grammarly et al.) aren't content, so they don't count as "preceding" —
 * keying off this instead of "any text emitted yet" preserves a leading empty
 * line (`<div><br></div><div>x</div>` → `\nx`) that would otherwise be dropped.
 */
function hasContentBefore(el: HTMLElement): boolean {
	let prev = el.previousSibling;
	while (prev && isExtensionNode(prev)) prev = prev.previousSibling;
	return prev !== null;
}

/**
 * A `<br>` that is the sole child of a block element is the browser's
 * placeholder for an empty line — the block boundary already accounts for
 * the newline, so the `<br>` itself must not emit another one.
 */
function isPlaceholderBR(node: Node, root: HTMLElement): boolean {
	const parent = node.parentNode;
	if (!parent) return false;
	if (parent === root) return root.childNodes.length === 1;
	return isBlockElement(parent) && parent.childNodes.length === 1;
}

type SerializeStop = { container: Node; offset: number };

type SerializeResult = {
	markup: string;
	plainText: string;
	/** True when a `stopAt` position was provided and reached. */
	stopped: boolean;
};

/**
 * Single-pass serializer for the editor DOM.
 *
 * Produces markup and plain text together, emitting `\n` for `<br>` and at
 * block-element boundaries. `getCursorOffset` reuses the same traversal with
 * a stop position, which guarantees cursor offsets and plain text can never
 * disagree about where line breaks are.
 */
function serializeEditor(
	root: HTMLElement,
	triggers: TriggerConfig[] | null,
	stopAt?: SerializeStop,
): SerializeResult {
	let markup = "";
	let plainText = "";
	let stopped = false;

	const append = (text: string) => {
		plainText += text;
		if (triggers) markup += text;
	};

	const cleanSlice = (text: string, end: number) => {
		let out = "";
		for (let i = 0; i < end; i++) {
			if (text[i] !== "\u200B") out += text[i];
		}
		return out;
	};

	const walk = (node: Node): boolean => {
		if (stopAt && node === stopAt.container && node.nodeType === Node.TEXT_NODE) {
			append(cleanSlice(node.textContent ?? "", stopAt.offset));
			stopped = true;
			return true;
		}

		if (isExtensionNode(node)) return false;

		if (node.nodeType === Node.TEXT_NODE) {
			append((node.textContent ?? "").replace(/\u200B/g, ""));
			return false;
		}

		if (node.nodeType !== Node.ELEMENT_NODE) return false;
		const el = node as HTMLElement;

		if (el.tagName === "MARK" && el.hasAttribute("data-mention")) {
			const displayText = el.textContent ?? "";
			plainText += displayText;
			if (triggers) {
				const trigger = el.getAttribute("data-mention") ?? "";
				const id = el.getAttribute("data-id") ?? "";
				const label = displayText.startsWith(trigger)
					? displayText.slice(trigger.length)
					: displayText;
				const cfg = triggers.find((t) => t.char === trigger);
				markup += cfg ? createMentionMarkup({ id, label }, cfg) : displayText;
			}
			return false;
		}

		if (el.tagName === "BR") {
			if (!isPlaceholderBR(el, root)) append("\n");
			return false;
		}

		if (isBlockElement(el) && hasContentBefore(el)) {
			append("\n");
		}

		const children = el.childNodes;
		for (let i = 0; i < children.length; i++) {
			if (stopAt && el === stopAt.container && i === stopAt.offset) {
				stopped = true;
				return true;
			}
			if (walk(children[i])) return true;
		}
		if (stopAt && el === stopAt.container && children.length === stopAt.offset) {
			stopped = true;
			return true;
		}
		return false;
	};

	const children = root.childNodes;
	for (let i = 0; i < children.length; i++) {
		if (stopAt && root === stopAt.container && i === stopAt.offset) {
			stopped = true;
			break;
		}
		if (walk(children[i])) break;
	}
	if (stopAt && root === stopAt.container && stopAt.offset >= children.length) {
		stopped = true;
	}

	return { markup, plainText, stopped };
}

/**
 * Read markup and plain text from a contenteditable element in one traversal.
 *
 * Adapters should prefer this over calling `getMarkupFromDOM` and
 * `getPlainTextFromDOM` separately — it halves the DOM walk on every input.
 */
export function readEditorState(
	el: HTMLElement,
	triggers: TriggerConfig[],
): { markup: string; plainText: string } {
	const { markup, plainText } = serializeEditor(el, triggers);
	return { markup, plainText };
}

/** Extract plain text from a contenteditable element, skipping extension nodes. */
export function getPlainTextFromDOM(el: HTMLElement): string {
	return serializeEditor(el, null).plainText;
}

/** Reconstruct markup string from a contenteditable element's DOM structure. */
export function getMarkupFromDOM(el: HTMLElement, triggers: TriggerConfig[]): string {
	return serializeEditor(el, triggers).markup;
}

/**
 * Get the cursor offset (in plain text characters) within a contenteditable element.
 *
 * Counts via the shared serializer with an early stop — no `cloneContents`,
 * no allocation proportional to document size.
 */
export function getCursorOffset(el: HTMLElement): number {
	const sel = window.getSelection();
	if (!sel || sel.rangeCount === 0) return 0;
	const range = sel.getRangeAt(0);
	const container = range.startContainer;
	if (container !== el && !el.contains(container)) return 0;
	const { plainText, stopped } = serializeEditor(el, null, {
		container,
		offset: range.startOffset,
	});
	return stopped ? plainText.length : 0;
}

/** Restore cursor to a plain-text character offset after innerHTML replacement. */
export function restoreCursor(el: HTMLElement, offset: number): void {
	const sel = window.getSelection();
	if (!sel) return;

	const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
	let remaining = offset;

	// biome-ignore lint/suspicious/noAssignInExpressions: standard TreeWalker iteration pattern
	for (let node: Node | null = null; (node = walker.nextNode()); ) {
		const text = node.textContent ?? "";
		const clean = text.replace(/\u200B/g, "");
		if (remaining <= clean.length) {
			const range = document.createRange();
			let actualOffset = 0;
			let counted = 0;
			for (let i = 0; i < text.length && counted < remaining; i++) {
				if (text[i] !== "\u200B") counted++;
				actualOffset = i + 1;
			}
			range.setStart(node, actualOffset);
			range.collapse(true);
			sel.removeAllRanges();
			sel.addRange(range);
			return;
		}
		remaining -= clean.length;
	}

	const range = document.createRange();
	range.selectNodeContents(el);
	range.collapse(false);
	sel.removeAllRanges();
	sel.addRange(range);
}

/** Get the caret's bounding rect for dropdown positioning. */
export function getCaretRect(el: HTMLElement): CaretPosition {
	const sel = window.getSelection();
	if (!sel || sel.rangeCount === 0) {
		const r = el.getBoundingClientRect();
		return { top: r.top, left: r.left, height: 20 };
	}

	const range = sel.getRangeAt(0).cloneRange();
	range.collapse(true);

	let rect = range.getBoundingClientRect();
	if (rect.height > 0) return { top: rect.top, left: rect.left, height: rect.height };

	const rects = range.getClientRects();
	if (rects.length > 0 && rects[0].height > 0) {
		return { top: rects[0].top, left: rects[0].left, height: rects[0].height };
	}

	const { startContainer, startOffset } = range;
	if (startContainer.nodeType === Node.TEXT_NODE) {
		const textLen = startContainer.textContent?.length ?? 0;
		if (startOffset < textLen) {
			range.setEnd(startContainer, startOffset + 1);
			rect = range.getBoundingClientRect();
			if (rect.height > 0) return { top: rect.top, left: rect.left, height: rect.height };
		}
		if (startOffset > 0) {
			range.setStart(startContainer, startOffset - 1);
			range.setEnd(startContainer, startOffset);
			rect = range.getBoundingClientRect();
			if (rect.height > 0) return { top: rect.top, left: rect.right, height: rect.height };
		}
	}

	const r = el.getBoundingClientRect();
	return { top: r.top, left: r.left, height: 20 };
}

/** Programmatically insert text at the current cursor position, preserving undo history. */
export function insertTextAtCursor(text: string): void {
	const success = document.execCommand("insertText", false, text);
	if (!success) {
		const sel = window.getSelection();
		if (sel && sel.rangeCount > 0) {
			const range = sel.getRangeAt(0);
			range.deleteContents();
			const node = document.createTextNode(text);
			range.insertNode(node);
			range.setStartAfter(node);
			range.collapse(true);
			sel.removeAllRanges();
			sel.addRange(range);
		}
	}
}

/**
 * Thresholds above which native insertion is bypassed on paste.
 *
 * Chrome's native multi-line insertion (`ReplaceSelectionCommand`) splits
 * pasted text into one block element per line and re-normalizes the tree on
 * each split — measured superlinear: 11ms at 100 lines, 103ms at 500,
 * 320ms at 1000, 30s+ at 5000. A single-fragment insert of 5000 lines
 * measures ~1.4ms. Below the thresholds the native path is kept because it
 * preserves the browser's undo stack.
 */
export const LARGE_PASTE_LINES = 100;
export const LARGE_PASTE_CHARS = 20_000;

/** True when pasted text is large enough to stall the native insertion path. */
export function isLargePaste(text: string): boolean {
	if (text.length > LARGE_PASTE_CHARS) return true;
	let lines = 0;
	for (let i = 0; i < text.length; i++) {
		if (text[i] === "\n" && ++lines > LARGE_PASTE_LINES) return true;
	}
	return false;
}

type PasteSnapshot = { html: string; cursor: number };

const pasteSnapshots = new WeakMap<HTMLElement, PasteSnapshot>();
const pasteListenerHosts = new WeakSet<HTMLElement>();

/** Input types this module dispatches itself, which must not invalidate the snapshot. */
function isSyntheticInputType(type: string): boolean {
	return type === "insertFromPaste" || type === "historyUndo";
}

/**
 * Attach the undo machinery for large pastes to an editor, exactly once.
 *
 * `beforeinput` intercepts the next Cmd/Ctrl+Z and restores the snapshot;
 * `input` invalidates the snapshot on the first real user edit so a later
 * undo can't wipe out text typed after the paste. Both ignore the synthetic
 * events this module dispatches. The listeners live for the element's
 * lifetime — idempotent and element-owned, so a second paste or an unmount
 * mid-paste cannot leak or race them (the earlier `setTimeout` approach
 * could miss the attach window on rapid re-paste or early unmount).
 */
function ensurePasteUndoListeners(el: HTMLElement): void {
	if (pasteListenerHosts.has(el)) return;
	pasteListenerHosts.add(el);

	el.addEventListener("beforeinput", (ev) => {
		if ((ev as InputEvent).inputType === "historyUndo" && undoLargePaste(el)) {
			ev.preventDefault();
		}
	});
	el.addEventListener("input", (ev) => {
		if (!isSyntheticInputType((ev as InputEvent).inputType)) pasteSnapshots.delete(el);
	});
}

/**
 * Insert large pasted text as a single text node, bypassing the browser's
 * superlinear per-line insertion, then dispatch a bubbling `input` event so
 * the adapter's normal pipeline picks up the change.
 *
 * Native undo cannot see this mutation (W3C editing #150), so the previous
 * editor state is snapshotted and the next `historyUndo` (Cmd/Ctrl+Z) is
 * intercepted to restore it. The snapshot is invalidated by the next user
 * edit, matching the expectation that one giant paste is one undo step.
 */
export function insertLargeText(el: HTMLElement, text: string): void {
	const sel = window.getSelection();
	if (!sel || sel.rangeCount === 0) return;

	pasteSnapshots.set(el, { html: el.innerHTML, cursor: getCursorOffset(el) });
	ensurePasteUndoListeners(el);

	const range = sel.getRangeAt(0);
	range.deleteContents();

	// A trailing "\n" inside a text node renders no final line box, and Chrome
	// cannot place a caret after a trailing <br> either. Use the browser's own
	// idiom for an empty last line — a <div><br></div> block (it serializes
	// back to "\n") — and put the caret inside it.
	const endsWithNewline = text.endsWith("\n");
	const node = document.createTextNode(endsWithNewline ? text.slice(0, -1) : text);
	range.insertNode(node);

	if (endsWithNewline && node.parentNode) {
		const lastLine = document.createElement("div");
		lastLine.appendChild(document.createElement("br"));
		node.parentNode.insertBefore(lastLine, node.nextSibling);
		range.setStart(lastLine, 0);
	} else {
		range.setStartAfter(node);
	}
	range.collapse(true);
	sel.removeAllRanges();
	sel.addRange(range);

	el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertFromPaste" }));
}

/**
 * Restore the pre-paste snapshot for an editor, if one is still valid.
 *
 * Wired automatically by `insertLargeText`; exported so adapters with their
 * own undo handling can trigger the restore directly. Returns true when a
 * snapshot was restored.
 */
export function undoLargePaste(el: HTMLElement): boolean {
	const snapshot = pasteSnapshots.get(el);
	if (!snapshot) return false;
	pasteSnapshots.delete(el);
	el.innerHTML = snapshot.html;
	restoreCursor(el, snapshot.cursor);
	el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "historyUndo" }));
	return true;
}

let plaintextOnlySupport: boolean | null = null;

/**
 * Whether the browser supports `contenteditable="plaintext-only"`.
 *
 * Lazily detected and cached on first call in a browser. During SSR this
 * returns false without caching, so adapters must call it from a
 * client-only phase (effect/mount) rather than baking the result into
 * server-rendered attributes — otherwise hydration freezes the wrong mode.
 */
export function supportsPlaintextOnly(): boolean {
	if (plaintextOnlySupport !== null) return plaintextOnlySupport;
	if (typeof document === "undefined") return false;
	const div = document.createElement("div");
	div.contentEditable = "plaintext-only";
	plaintextOnlySupport = div.contentEditable === "plaintext-only";
	return plaintextOnlySupport;
}

type CaretHost = {
	getState(): { status: MachineStatus };
	updateCaretPosition(position: CaretPosition): void;
};

/**
 * Push the caret rect to the controller, but only while the dropdown is in
 * play — reading the rect forces a synchronous layout, which is wasted work
 * on every plain keystroke.
 */
export function updateCaretIfActive(controller: CaretHost, el: HTMLElement): void {
	const status = controller.getState().status;
	if (status === "suggesting" || status === "navigating" || status === "loading") {
		controller.updateCaretPosition(getCaretRect(el));
	}
}

/**
 * Shared paste handling for all adapters.
 *
 * Single-line editors flatten newlines. Large pastes take the fast path
 * (see `insertLargeText`). Browsers without plaintext-only support get the
 * clipboard's text/plain inserted manually so rich HTML never enters the
 * editor. Returns true when the event was handled (default prevented);
 * false means the native insertion should proceed.
 */
export function handleEditorPaste(
	e: ClipboardEvent,
	el: HTMLElement,
	options: { singleLine?: boolean; plaintextOnly?: boolean },
): boolean {
	const raw = e.clipboardData?.getData("text/plain") ?? "";
	// Single-line editors flatten any line breaks to spaces first, so the
	// large-paste check below also covers a huge single-line paste.
	const text = options.singleLine
		? raw.replace(/\s*[\r\n]+\s*/g, " ")
		: raw.replace(/\r\n?/g, "\n");

	if (isLargePaste(text)) {
		e.preventDefault();
		insertLargeText(el, text);
		return true;
	}

	if (options.singleLine || !options.plaintextOnly) {
		e.preventDefault();
		insertTextAtCursor(text);
		return true;
	}

	return false;
}

/**
 * Insert a mention into the contenteditable DOM, replacing the trigger+query text with a styled <mark>.
 *
 * Pure DOM — no framework types. Returns the new DOM state (markup, plainText, cursor)
 * or null if insertion could not be performed (bail-out conditions).
 */
export function performMentionInsertion(
	el: HTMLElement,
	item: { id: string; label: string },
	activeTrigger: string,
	query: string,
	triggerConfig: TriggerConfig,
	triggers: TriggerConfig[],
): { markup: string; plainText: string; cursor: number } | null {
	const sel = window.getSelection();
	if (!sel || sel.rangeCount === 0) return null;

	const range = sel.getRangeAt(0);
	let container: Node = range.startContainer;
	let offset = range.startOffset;

	if (container.nodeType === Node.ELEMENT_NODE) {
		if (offset > 0 && container.childNodes[offset - 1]?.nodeType === Node.TEXT_NODE) {
			container = container.childNodes[offset - 1];
			offset = container.textContent?.length ?? 0;
		} else if (
			offset < container.childNodes.length &&
			container.childNodes[offset]?.nodeType === Node.TEXT_NODE
		) {
			container = container.childNodes[offset];
			offset = 0;
		} else {
			return null;
		}
	}

	if (container.nodeType !== Node.TEXT_NODE) return null;

	const triggerQueryLen = activeTrigger.length + query.length;
	if (offset < triggerQueryLen) return null;

	const startRawOffset = offset - triggerQueryLen;
	const expectedText = activeTrigger + query;
	const fullText = container.textContent ?? "";
	if (fullText.slice(startRawOffset, offset) !== expectedText) return null;

	const parent = container.parentNode;
	if (!parent || !el.contains(parent)) return null;

	const mark = document.createElement("mark");
	mark.setAttribute("data-mention", activeTrigger);
	mark.setAttribute("data-id", item.id);
	mark.contentEditable = "false";
	const bg = triggerConfig.color ?? "var(--mention-bg, oklch(0.93 0.03 250))";
	mark.style.cssText = `background-color:${bg};color:var(--mention-color, inherit);border-radius:var(--mention-radius, 3px);padding:0 2px`;
	mark.textContent = activeTrigger + item.label;

	const before = fullText.slice(0, startRawOffset);
	const after = fullText.slice(offset);

	const frag = document.createDocumentFragment();
	if (before) frag.appendChild(document.createTextNode(before));
	frag.appendChild(mark);

	const spacer = document.createTextNode("\u200B ");
	frag.appendChild(spacer);

	if (after) frag.appendChild(document.createTextNode(after));

	parent.replaceChild(frag, container);

	const newRange = document.createRange();
	newRange.setStart(spacer, spacer.length);
	newRange.collapse(true);
	sel.removeAllRanges();
	sel.addRange(newRange);

	const { markup, plainText } = readEditorState(el, triggers);
	return { markup, plainText, cursor: getCursorOffset(el) };
}

/**
 * Convert a markup string to HTML for rendering in a contenteditable element.
 *
 * A trailing "\n" is emitted as an empty `<div><br></div>` line so the caret
 * can sit on the final empty line — mirroring `insertLargeText` and the
 * browser's own representation.
 */
export function buildMentionHTML(markup: string, triggers: TriggerConfig[]): string {
	const endsWithNewline = markup.endsWith("\n");
	const segments = parseMarkup(endsWithNewline ? markup.slice(0, -1) : markup, triggers);
	const body = segments
		.map((seg) => {
			if (seg.type === "mention") {
				const cfg = triggers.find((t) => t.char === seg.trigger);
				const bg = cfg?.color ?? "var(--mention-bg, oklch(0.93 0.03 250))";
				const radius = "var(--mention-radius, 3px)";
				return `<mark data-mention="${escapeHTML(seg.trigger)}" data-id="${escapeHTML(seg.id)}" contenteditable="false" style="background-color:${bg};color:var(--mention-color, inherit);border-radius:${radius};padding:0 2px">${escapeHTML(seg.text)}</mark>\u200B`;
			}
			return escapeHTML(seg.text);
		})
		.join("");
	return endsWithNewline ? `${body}<div><br></div>` : body;
}
