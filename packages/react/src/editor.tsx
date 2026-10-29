"use client";
import {
	handleEditorPaste,
	insertTextAtCursor,
	supportsPlaintextOnly,
} from "@skyastrall/mentions-core";
import { type ReactNode, useEffect, useState } from "react";
import { useMentionsContext } from "./context.js";
export type EditorProps = {
	placeholder?: string;
	className?: string;
	style?: React.CSSProperties;
	disabled?: boolean;
	readOnly?: boolean;
	autoFocus?: boolean;
	singleLine?: boolean;
};

function injectStyles(): void {
	if (typeof document === "undefined") return;
	if (document.getElementById("mentions-editor-styles")) return;
	const style = document.createElement("style");
	style.id = "mentions-editor-styles";
	style.textContent = `[data-mentions-editor][data-empty]::before{content:attr(data-placeholder);color:var(--mention-placeholder,var(--color-text-dim,#9ca3af));pointer-events:none;float:left;height:0}[data-mentions-editor][data-singleline] br{display:none}`;
	document.head.appendChild(style);
}

export function Editor({
	className,
	style,
	placeholder,
	disabled,
	readOnly,
	autoFocus,
	singleLine: singleLineProp,
}: EditorProps): ReactNode {
	const ctx = useMentionsContext();
	const isSingleLine = singleLineProp ?? ctx.singleLine;

	const isEmpty = !ctx.state.markup;
	const [plaintextOnly, setPlaintextOnly] = useState(false);
	useEffect(() => {
		setPlaintextOnly(supportsPlaintextOnly());
	}, []);

	useEffect(() => {
		injectStyles();
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: ctx.editorRef is a stable ref
	useEffect(() => {
		const el = ctx.editorRef.current;
		if (!el) return;
		if (!isSingleLine) return;

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
		ctx.handleInput();

		const handler = (e: Event) => {
			const inputEvent = e as InputEvent;
			if (
				inputEvent.inputType === "insertParagraph" ||
				inputEvent.inputType === "insertLineBreak"
			) {
				e.preventDefault();
			}
		};
		el.addEventListener("beforeinput", handler);
		return () => el.removeEventListener("beforeinput", handler);
	}, [isSingleLine]);

	const {
		onKeyDown,
		onCompositionStart,
		onCompositionEnd,
		onBlur,
		onPaste: _hookPaste,
		...ariaProps
	} = ctx.inputProps;

	const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
		onKeyDown(e);
		if (isSingleLine && e.key === "Enter" && !e.defaultPrevented) {
			e.preventDefault();
		}
	};

	const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
		const el = ctx.editorRef.current;
		if (!el) return;
		handleEditorPaste(e.nativeEvent, el, {
			singleLine: isSingleLine,
			plaintextOnly: supportsPlaintextOnly(),
		});
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: mount-only autofocus
	useEffect(() => {
		if (autoFocus) ctx.editorRef.current?.focus();
	}, []);

	const handleDrop = isSingleLine
		? (e: React.DragEvent<HTMLDivElement>) => {
				e.preventDefault();
				const text = e.dataTransfer.getData("text/plain").replace(/[\n\r]/g, " ");
				insertTextAtCursor(text);
			}
		: undefined;

	const editableValue = disabled || readOnly ? false : plaintextOnly ? "plaintext-only" : true;

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: contentEditable div with role="combobox" from inputProps spread
		// biome-ignore lint/a11y/useAriaPropsSupportedByRole: role="combobox" comes from inputProps spread, not statically visible
		<div
			ref={ctx.editorRef as React.RefObject<HTMLDivElement>}
			className={className}
			contentEditable={editableValue}
			suppressContentEditableWarning
			data-mentions-editor=""
			data-placeholder={placeholder}
			{...(isEmpty ? { "data-empty": "" } : {})}
			data-gramm="false"
			data-gramm_editor="false"
			data-enable-grammarly="false"
			{...(isSingleLine ? { "data-singleline": "" } : {})}
			aria-multiline={!isSingleLine}
			tabIndex={disabled ? -1 : 0}
			onInput={() => {
				ctx.handleInput();
			}}
			onKeyDown={handleKeyDown}
			onPaste={handlePaste}
			onDrop={handleDrop}
			onCompositionStart={onCompositionStart}
			onCompositionEnd={(e) => {
				onCompositionEnd(e);
				requestAnimationFrame(() => {
					ctx.handleInput();
				});
			}}
			onBlur={onBlur}
			style={{
				outline: "none",
				whiteSpace: isSingleLine ? "nowrap" : "pre-wrap",
				overflowWrap: isSingleLine ? undefined : "break-word",
				wordWrap: isSingleLine ? undefined : "break-word",
				minHeight: isSingleLine ? undefined : "1.5em",
				overflow: isSingleLine ? "hidden" : undefined,
				overflowX: isSingleLine ? "auto" : undefined,
				...style,
			}}
			{...(ariaProps as React.HTMLAttributes<HTMLDivElement>)}
		/>
	);
}
