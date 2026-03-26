<script lang="ts">
	import { insertTextAtCursor } from "@skyastrall/mentions-core";
	import { onMount } from "svelte";
	import { getMentionsContext } from "./use-mentions.svelte.js";

	interface Props {
		placeholder?: string;
		class?: string;
		disabled?: boolean;
		readOnly?: boolean;
		autoFocus?: boolean;
		singleLine?: boolean;
	}

	let { placeholder, class: className, disabled, readOnly, autoFocus, singleLine: singleLineProp }: Props = $props();

	const ctx = getMentionsContext();
	const isSingleLine = $derived(singleLineProp ?? ctx.singleLine);
	const isEmpty = $derived(!ctx.state.markup);
	const editable = $derived(disabled || readOnly ? false : supportsPlaintextOnly ? "plaintext-only" : true);

	let el: HTMLDivElement;
	let beforeInputHandler: ((e: Event) => void) | null = null;
	let scrollHandler: (() => void) | null = null;

	const supportsPlaintextOnly =
		typeof document !== "undefined" &&
		(() => {
			const div = document.createElement("div");
			div.contentEditable = "plaintext-only";
			return div.contentEditable === "plaintext-only";
		})();

	function injectStyles(): void {
		if (typeof document === "undefined") return;
		if (document.getElementById("mentions-editor-styles")) return;
		const style = document.createElement("style");
		style.id = "mentions-editor-styles";
		style.textContent = `[data-mentions-editor][data-empty]::before{content:attr(data-placeholder);color:var(--mention-placeholder,var(--color-text-dim,#9ca3af));pointer-events:none;float:left;height:0}[data-mentions-editor][data-singleline] br{display:none}`;
		document.head.appendChild(style);
	}

	function attachSingleLineGuard(): void {
		if (!el) return;
		if (beforeInputHandler) el.removeEventListener("beforeinput", beforeInputHandler);
		beforeInputHandler = (e: Event) => {
			const inputEvent = e as InputEvent;
			if (inputEvent.inputType === "insertParagraph" || inputEvent.inputType === "insertLineBreak") {
				e.preventDefault();
			}
		};
		el.addEventListener("beforeinput", beforeInputHandler);
	}

	function removeSingleLineGuard(): void {
		if (!el || !beforeInputHandler) return;
		el.removeEventListener("beforeinput", beforeInputHandler);
		beforeInputHandler = null;
	}

	function stripNewlines(): void {
		if (!el) return;
		for (const br of el.querySelectorAll("br")) {
			br.replaceWith(document.createTextNode(" "));
		}
		for (const div of el.querySelectorAll("div:not([data-mention])")) {
			const parent = div.parentNode;
			if (!parent) continue;
			parent.insertBefore(document.createTextNode(" "), div);
			while (div.firstChild) parent.insertBefore(div.firstChild, div);
			parent.removeChild(div);
		}
	}

	function handlePaste(e: ClipboardEvent): void {
		if (isSingleLine) {
			e.preventDefault();
			const text = e.clipboardData?.getData("text/plain")?.replace(/[\n\r]/g, " ") ?? "";
			insertTextAtCursor(text);
		} else if (!supportsPlaintextOnly) {
			e.preventDefault();
			const text = e.clipboardData?.getData("text/plain") ?? "";
			insertTextAtCursor(text);
		}
	}

	function handleDrop(e: DragEvent): void {
		if (!isSingleLine) return;
		e.preventDefault();
		const text = e.dataTransfer?.getData("text/plain")?.replace(/[\n\r]/g, " ") ?? "";
		insertTextAtCursor(text);
	}

	function handleKeyDown(e: KeyboardEvent): void {
		ctx.handleKeyDown(e);
		if (isSingleLine && e.key === "Enter" && !e.defaultPrevented) {
			e.preventDefault();
		}
	}

	function handleCompositionEnd(): void {
		ctx.handleCompositionEnd();
		requestAnimationFrame(() => {
			ctx.handleInput();
		});
	}

	$effect(() => {
		if (isSingleLine) {
			attachSingleLineGuard();
			stripNewlines();
			ctx.handleInput();
		} else {
			removeSingleLineGuard();
		}
	});

	onMount(() => {
		ctx.editorRef = el;
		injectStyles();

		scrollHandler = () => ctx.handleScroll();
		window.addEventListener("scroll", scrollHandler, true);

		if (autoFocus) el.focus();

		return () => {
			if (beforeInputHandler) el.removeEventListener("beforeinput", beforeInputHandler);
			if (scrollHandler) window.removeEventListener("scroll", scrollHandler, true);
		};
	});
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	bind:this={el}
	class={className}
	contenteditable={editable}
	data-mentions-editor=""
	data-placeholder={placeholder}
	data-empty={isEmpty ? "" : undefined}
	data-gramm="false"
	data-gramm_editor="false"
	data-enable-grammarly="false"
	data-singleline={isSingleLine ? "" : undefined}
	aria-multiline={!isSingleLine}
	tabindex={disabled ? -1 : 0}
	role={ctx.aria.inputProps.role}
	aria-expanded={ctx.aria.inputProps["aria-expanded"]}
	aria-controls={ctx.aria.inputProps["aria-controls"]}
	aria-autocomplete={ctx.aria.inputProps["aria-autocomplete"]}
	aria-activedescendant={ctx.aria.inputProps["aria-activedescendant"]}
	aria-haspopup={ctx.aria.inputProps["aria-haspopup"]}
	oninput={() => ctx.handleInput()}
	onkeydown={handleKeyDown}
	onpaste={handlePaste}
	ondrop={handleDrop}
	oncompositionstart={() => ctx.handleCompositionStart()}
	oncompositionend={handleCompositionEnd}
	onblur={(e) => ctx.handleBlur(e)}
	style:outline="none"
	style:white-space={isSingleLine ? "nowrap" : "pre-wrap"}
	style:overflow-wrap={isSingleLine ? undefined : "break-word"}
	style:word-wrap={isSingleLine ? undefined : "break-word"}
	style:min-height={isSingleLine ? undefined : "1.5em"}
	style:overflow={isSingleLine ? "hidden" : undefined}
	style:overflow-x={isSingleLine ? "auto" : undefined}
></div>
