import { createMentionMarkup, parseMarkup } from "./markup.ts";
import type { CaretPosition, TriggerConfig } from "./types.ts";

/** Escape HTML special characters for safe innerHTML insertion. */
export function escapeHTML(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
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

/** Extract plain text from a contenteditable element, skipping extension nodes. */
export function getPlainTextFromDOM(el: HTMLElement): string {
	let text = "";
	const walk = (node: Node) => {
		if (isExtensionNode(node)) return;
		if (node.nodeType === Node.TEXT_NODE) {
			text += (node.textContent ?? "").replace(/\u200B/g, "");
		} else if (node.nodeType === Node.ELEMENT_NODE) {
			const elem = node as HTMLElement;
			if (elem.tagName === "MARK" && elem.hasAttribute("data-mention")) {
				text += elem.textContent ?? "";
			} else if (elem.tagName === "BR") {
				text += "\n";
			} else {
				for (const child of elem.childNodes) walk(child);
			}
		}
	};
	walk(el);
	return text;
}

/** Reconstruct markup string from a contenteditable element's DOM structure. */
export function getMarkupFromDOM(el: HTMLElement, triggers: TriggerConfig[]): string {
	let markup = "";
	const walk = (node: Node) => {
		if (isExtensionNode(node)) return;
		if (node.nodeType === Node.TEXT_NODE) {
			markup += (node.textContent ?? "").replace(/\u200B/g, "");
		} else if (node.nodeType === Node.ELEMENT_NODE) {
			const elem = node as HTMLElement;
			if (elem.tagName === "MARK" && elem.hasAttribute("data-mention")) {
				const trigger = elem.getAttribute("data-mention") ?? "";
				const id = elem.getAttribute("data-id") ?? "";
				const displayText = elem.textContent ?? "";
				const label = displayText.startsWith(trigger)
					? displayText.slice(trigger.length)
					: displayText;
				const cfg = triggers.find((t) => t.char === trigger);
				if (cfg) {
					markup += createMentionMarkup({ id, label }, cfg);
				} else {
					markup += displayText;
				}
			} else if (elem.tagName === "BR") {
				markup += "\n";
			} else {
				for (const child of elem.childNodes) walk(child);
			}
		}
	};
	walk(el);
	return markup;
}

/** Get the cursor offset (in plain text characters) within a contenteditable element. */
export function getCursorOffset(el: HTMLElement): number {
	const sel = window.getSelection();
	if (!sel || sel.rangeCount === 0) return 0;
	const range = sel.getRangeAt(0);
	const pre = document.createRange();
	pre.selectNodeContents(el);
	pre.setEnd(range.startContainer, range.startOffset);
	const frag = pre.cloneContents();
	const temp = document.createElement("div");
	temp.appendChild(frag);
	return getPlainTextFromDOM(temp).length;
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

	return {
		markup: getMarkupFromDOM(el, triggers),
		plainText: getPlainTextFromDOM(el),
		cursor: getCursorOffset(el),
	};
}

/** Convert a markup string to HTML for rendering in a contenteditable element. */
export function buildMentionHTML(markup: string, triggers: TriggerConfig[]): string {
	const segments = parseMarkup(markup, triggers);
	return segments
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
}
