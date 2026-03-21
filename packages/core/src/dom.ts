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

/** Convert a markup string to HTML for rendering in a contenteditable element. */
export function buildMentionHTML(markup: string, triggers: TriggerConfig[]): string {
	const segments = parseMarkup(markup, triggers);
	return segments
		.map((seg) => {
			if (seg.type === "mention") {
				const cfg = triggers.find((t) => t.char === seg.trigger);
				const bg = cfg?.color ?? "var(--mention-bg, oklch(0.93 0.03 250))";
				const radius = "var(--mention-radius, 3px)";
				return `<mark data-mention="${escapeHTML(seg.trigger)}" data-id="${escapeHTML(seg.id)}" contenteditable="false" style="background-color:${bg};border-radius:${radius};padding:0 2px">${escapeHTML(seg.text)}</mark>\u200B`;
			}
			return escapeHTML(seg.text);
		})
		.join("");
}
