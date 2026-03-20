import type { CaretPosition } from "./types.ts";

const STYLE_PROPERTIES = [
	"direction",
	"boxSizing",
	"width",
	"height",
	"overflowX",
	"overflowY",
	"borderTopWidth",
	"borderRightWidth",
	"borderBottomWidth",
	"borderLeftWidth",
	"borderStyle",
	"paddingTop",
	"paddingRight",
	"paddingBottom",
	"paddingLeft",
	"fontStyle",
	"fontVariant",
	"fontWeight",
	"fontStretch",
	"fontSize",
	"fontSizeAdjust",
	"lineHeight",
	"fontFamily",
	"textAlign",
	"textTransform",
	"textIndent",
	"textDecoration",
	"letterSpacing",
	"wordSpacing",
	"tabSize",
] as const;

/**
 * Measure the pixel coordinates of the caret at a given character `position`
 * inside a textarea element.
 *
 * Creates an off-screen mirror `<div>` that replicates the textarea's text and
 * styling, then reads the offset of a `<span>` placed at the caret position.
 * The mirror element is always removed, even if an error occurs.
 *
 * Returns `{ top: 0, left: 0, height: 16 }` when called in an SSR environment
 * where `document` is not available.
 */
export function getCaretCoordinates(element: HTMLTextAreaElement, position: number): CaretPosition {
	if (typeof document === "undefined") {
		return { top: 0, left: 0, height: 16 };
	}

	const div = document.createElement("div");

	try {
		const style = div.style;
		const computed = getComputedStyle(element);

		style.position = "absolute";
		style.visibility = "hidden";
		style.whiteSpace = "pre-wrap";
		style.wordWrap = "break-word";
		style.overflow = "hidden";

		for (const prop of STYLE_PROPERTIES) {
			style[prop as unknown as number] = computed.getPropertyValue(
				prop.replace(/([A-Z])/g, "-$1").toLowerCase(),
			);
		}

		document.body.appendChild(div);

		div.textContent = element.value.substring(0, position);

		const span = document.createElement("span");
		span.textContent = element.value.substring(position) || ".";
		div.appendChild(span);

		const coordinates: CaretPosition = {
			top: span.offsetTop - element.scrollTop,
			left: span.offsetLeft - element.scrollLeft,
			height: Number.parseInt(computed.lineHeight, 10) || Number.parseInt(computed.fontSize, 10),
		};

		return coordinates;
	} finally {
		if (div.parentNode) {
			div.parentNode.removeChild(div);
		}
	}
}
