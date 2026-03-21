import type { MentionItem, TriggerConfig } from "@skyastrall/mentions-core";
import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useImperativeHandle,
	useRef,
} from "react";
import { createPortal } from "react-dom";
import { type UseMentionsReturn, useMentions } from "./use-mentions.ts";

export type MentionsHandle = {
	focus: () => void;
	clear: () => void;
	getValue: () => { markup: string; plainText: string };
	insertTrigger: (trigger: string) => void;
};

type MentionsContextValue = UseMentionsReturn & {
	triggers: TriggerConfig[];
	singleLine?: boolean;
};

const MentionsContext: React.Context<MentionsContextValue | null> =
	createContext<MentionsContextValue | null>(null);

function useMentionsContext(): MentionsContextValue {
	const ctx = useContext(MentionsContext);
	if (!ctx) {
		throw new Error("Mentions compound components must be used within <Mentions>");
	}
	return ctx;
}

export type MentionsProps = {
	triggers: TriggerConfig[];
	value?: string;
	defaultValue?: string;
	onChange?: (markup: string, plainText: string) => void;
	onSelect?: (item: MentionItem, trigger: string) => void;
	onRemove?: (item: MentionItem, trigger: string) => void;
	onQueryChange?: (query: string, trigger: string) => void;
	onOpen?: (trigger: string) => void;
	onClose?: () => void;
	onError?: (error: Error) => void;
	children?: ReactNode;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
	readOnly?: boolean;
	autoFocus?: boolean;
	renderItem?: (item: MentionItem, highlighted: boolean) => ReactNode;
	singleLine?: boolean;
	ref?: React.Ref<MentionsHandle>;
	ghostText?: string;
	onAcceptGhostText?: () => void;
};

export function Mentions({
	triggers,
	value,
	defaultValue,
	onChange,
	onSelect,
	onRemove,
	onQueryChange,
	onOpen,
	onClose,
	onError,
	children,
	placeholder,
	className,
	disabled,
	readOnly,
	autoFocus,
	renderItem,
	singleLine,
	ref,
	ghostText,
	onAcceptGhostText,
}: MentionsProps): ReactNode {
	const api = useMentions({
		triggers,
		value,
		defaultValue,
		onChange,
		onSelect,
		onRemove,
		onQueryChange,
		onOpen,
		onClose,
		onError,
		ghostText,
		onAcceptGhostText,
	});

	useImperativeHandle(
		ref,
		() => ({
			focus: api.focus,
			clear: api.clear,
			getValue: () => ({ markup: api.markup, plainText: api.plainText }),
			insertTrigger: api.insertTrigger,
		}),
		[api.focus, api.clear, api.markup, api.plainText, api.insertTrigger],
	);

	const ctx: MentionsContextValue = { ...api, triggers, singleLine };

	if (!children) {
		return (
			<MentionsContext.Provider value={ctx}>
				<div data-mentions="" style={{ position: "relative" }}>
					<Mentions.Editor
						className={className}
						placeholder={placeholder}
						disabled={disabled}
						readOnly={readOnly}
						autoFocus={autoFocus}
						singleLine={singleLine}
					/>
					{(api.isOpen || api.isLoading) && (
						<Mentions.Portal>
							<Mentions.List>
								{api.isLoading ? (
									<Mentions.Loading>Loading...</Mentions.Loading>
								) : api.items.length === 0 ? (
									<Mentions.Empty>No results</Mentions.Empty>
								) : (
									api.items.map((item, i) => (
										<Mentions.Item key={item.id} index={i}>
											{renderItem ? renderItem(item, i === api.highlightedIndex) : item.label}
										</Mentions.Item>
									))
								)}
							</Mentions.List>
						</Mentions.Portal>
					)}
				</div>
			</MentionsContext.Provider>
		);
	}

	return (
		<MentionsContext.Provider value={ctx}>
			<div data-mentions="" style={{ position: "relative" }}>
				{children}
			</div>
		</MentionsContext.Provider>
	);
}

export namespace Mentions {
	export type EditorProps = {
		placeholder?: string;
		className?: string;
		style?: React.CSSProperties;
		disabled?: boolean;
		readOnly?: boolean;
		autoFocus?: boolean;
		singleLine?: boolean;
	};

	const SUPPORTS_PLAINTEXT_ONLY =
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

		useEffect(() => {
			injectStyles();
		}, []);

		// biome-ignore lint/correctness/useExhaustiveDependencies: ctx.editorRef is a stable ref
		useEffect(() => {
			if (!isSingleLine) return;
			const el = ctx.editorRef.current;
			if (!el) return;
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

		const { onKeyDown, onCompositionStart, onCompositionEnd, onBlur, ...ariaProps } =
			ctx.inputProps;

		const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
			onKeyDown(e);
			if (isSingleLine && e.key === "Enter" && !e.defaultPrevented) {
				e.preventDefault();
			}
		};

		const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
			if (isSingleLine) {
				e.preventDefault();
				const text = e.clipboardData.getData("text/plain").replace(/[\n\r]/g, " ");
				document.execCommand("insertText", false, text);
			} else if (!SUPPORTS_PLAINTEXT_ONLY) {
				e.preventDefault();
				const text = e.clipboardData.getData("text/plain");
				document.execCommand("insertText", false, text);
			}
		};

		// biome-ignore lint/correctness/useExhaustiveDependencies: mount-only autofocus
		useEffect(() => {
			if (autoFocus) ctx.editorRef.current?.focus();
		}, []);

		const handleDrop = isSingleLine
			? (e: React.DragEvent<HTMLDivElement>) => {
					e.preventDefault();
					const text = e.dataTransfer.getData("text/plain").replace(/[\n\r]/g, " ");
					document.execCommand("insertText", false, text);
				}
			: undefined;

		const editableValue =
			disabled || readOnly
				? false
				: SUPPORTS_PLAINTEXT_ONLY
					? ("plaintext-only" as unknown as boolean)
					: true;

		return (
			// biome-ignore lint/a11y/noStaticElementInteractions: contentEditable div with role="combobox" from inputProps spread
			// biome-ignore lint/a11y/useAriaPropsSupportedByRole: role="combobox" comes from inputProps spread, not statically visible
			<div
				ref={ctx.editorRef}
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

	export type PortalProps = {
		children: ReactNode;
		container?: HTMLElement;
	};

	export function Portal({ children, container }: PortalProps): ReactNode {
		const ctx = useMentionsContext();

		if (!ctx.isOpen) return null;
		if (typeof document === "undefined") return null;

		let dropdownStyle: React.CSSProperties = {
			position: "fixed",
			zIndex: 9999,
		};

		if (ctx.caretPosition) {
			dropdownStyle = {
				...dropdownStyle,
				top: ctx.caretPosition.top + ctx.caretPosition.height + 4,
				left: ctx.caretPosition.left,
			};
		}

		const content = (
			// biome-ignore lint/a11y/noStaticElementInteractions: onMouseDown prevents blur
			<div
				role="presentation"
				style={dropdownStyle}
				data-mentions-portal=""
				data-mentions=""
				onMouseDown={(e) => e.preventDefault()}
			>
				{children}
			</div>
		);

		if (container) {
			return createPortal(content, container);
		}

		return content;
	}

	export type ListProps = {
		children: ReactNode;
		className?: string;
		style?: React.CSSProperties;
	};

	export function List({ children, className, style }: ListProps): ReactNode {
		const ctx = useMentionsContext();

		return (
			<ul
				className={className}
				style={{
					listStyle: "none",
					margin: 0,
					padding: "4px 0",
					maxHeight: "var(--dropdown-max-height, 240px)",
					overflowY: "auto",
					backgroundColor: "var(--dropdown-bg, white)",
					border: "var(--dropdown-border, 1px solid #e2e8f0)",
					borderRadius: "var(--dropdown-radius, 8px)",
					boxShadow: "var(--dropdown-shadow, 0 4px 12px rgba(0,0,0,0.08))",
					minWidth: 200,
					...style,
				}}
				{...ctx.listProps}
			>
				{children}
			</ul>
		);
	}

	export type ItemProps = {
		index?: number;
		children?: ReactNode;
		className?: string;
		style?: React.CSSProperties;
		render?: (props: { item: MentionItem; highlighted: boolean }) => ReactNode;
	};

	export function Item({ index, children, className, style, render }: ItemProps): ReactNode {
		if (index === undefined) {
			return (
				<ItemMapper className={className} style={style} render={render}>
					{children}
				</ItemMapper>
			);
		}

		return (
			<ItemSingle index={index} className={className} style={style} render={render}>
				{children}
			</ItemSingle>
		);
	}

	function ItemMapper({ children, className, style, render }: Omit<ItemProps, "index">): ReactNode {
		const ctx = useMentionsContext();
		return (
			<>
				{ctx.items.map((item, i) => (
					<ItemSingle key={item.id} index={i} className={className} style={style} render={render}>
						{children}
					</ItemSingle>
				))}
			</>
		);
	}

	function ItemSingle({
		index,
		children,
		className,
		style,
		render,
	}: ItemProps & { index: number }): ReactNode {
		const ctx = useMentionsContext();
		const itemRef = useRef<HTMLLIElement>(null);

		const item = ctx.items[index];
		const highlighted = index === ctx.highlightedIndex;
		const itemProps = ctx.getItemProps(index);

		useEffect(() => {
			if (highlighted && itemRef.current) {
				itemRef.current.scrollIntoView({ block: "nearest" });
			}
		}, [highlighted]);

		if (!item) return null;

		return (
			<li
				ref={itemRef}
				className={className}
				style={{
					padding: "var(--item-padding, 8px 12px)",
					cursor: "pointer",
					backgroundColor: highlighted ? "var(--item-active-bg, #f1f5f9)" : "transparent",
					...style,
				}}
				{...itemProps}
			>
				{render ? render({ item, highlighted }) : (children ?? item.label)}
			</li>
		);
	}

	export type EmptyProps = {
		children: ReactNode;
		className?: string;
		style?: React.CSSProperties;
	};

	export function Empty({ children, className, style }: EmptyProps): ReactNode {
		const ctx = useMentionsContext();
		if (ctx.items.length > 0) return null;

		return (
			<div
				className={className}
				style={{
					padding: "var(--item-padding, 8px 12px)",
					color: "#94a3b8",
					fontSize: "0.875rem",
					...style,
				}}
			>
				{children}
			</div>
		);
	}

	export type LoadingProps = {
		children: ReactNode;
		className?: string;
		style?: React.CSSProperties;
	};

	export function Loading({ children, className, style }: LoadingProps): ReactNode {
		return (
			<div
				className={className}
				style={{
					padding: "var(--item-padding, 8px 12px)",
					color: "#94a3b8",
					fontSize: "0.875rem",
					...style,
				}}
			>
				{children}
			</div>
		);
	}
}
