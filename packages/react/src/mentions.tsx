import { type MentionItem, parseMarkup, type TriggerConfig } from "@skyastrall/mentions-core";
import {
	createContext,
	type ForwardRefExoticComponent,
	forwardRef,
	type ReactNode,
	type RefAttributes,
	useContext,
	useEffect,
	useImperativeHandle,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import { type UseMentionsReturn, useMentions } from "./use-mentions.ts";

/** Imperative handle exposed via `ref` on the `Mentions` component. */
export type MentionsHandle = {
	focus: () => void;
	clear: () => void;
	getValue: () => { markup: string; plainText: string };
	insertText: (text: string) => void;
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
	rows?: number;
	renderItem?: (item: MentionItem, highlighted: boolean) => ReactNode;
	singleLine?: boolean;
	ref?: React.Ref<MentionsHandle>;
	/** Dimmed inline suggestion shown after the cursor. Tab accepts, any other key dismisses. */
	ghostText?: string;
	/** Called when the user presses Tab to accept the ghost text. */
	onAcceptGhostText?: () => void;
};

/**
 * Compound component for building mention/autocomplete UIs.
 * Renders a default UI when no `children` are provided, or acts as a context provider for custom layouts.
 */
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
	rows,
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
			focus: () => api.focus(),
			clear: () => api.clear(),
			getValue: () => ({ markup: api.markup, plainText: api.plainText }),
			insertText: (text: string) => {
				const el = api.textareaRef.current;
				if (!el) return;
				const start = el.selectionStart;
				const end = el.selectionEnd;
				const before = el.value.slice(0, start);
				const after = el.value.slice(end);
				const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
					Object.getPrototypeOf(el),
					"value",
				)?.set;
				nativeInputValueSetter?.call(el, before + text + after);
				el.selectionStart = start + text.length;
				el.selectionEnd = start + text.length;
				el.dispatchEvent(new Event("input", { bubbles: true }));
			},
			insertTrigger: (trigger: string) => api.insertTrigger(trigger),
		}),
		[api],
	);

	const ctx: MentionsContextValue = { ...api, triggers, singleLine };

	if (!children) {
		return (
			<MentionsContext.Provider value={ctx}>
				<div className={className} data-mentions="" style={{ position: "relative" }}>
					<Mentions.Overlay />
					<Mentions.Input
						placeholder={placeholder}
						disabled={disabled}
						readOnly={readOnly}
						autoFocus={autoFocus}
						rows={rows}
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
			<div className={className} data-mentions="" style={{ position: "relative" }}>
				{children}
			</div>
		</MentionsContext.Provider>
	);
}

export namespace Mentions {
	export type InputProps = {
		placeholder?: string;
		className?: string;
		style?: React.CSSProperties;
		rows?: number;
		disabled?: boolean;
		readOnly?: boolean;
		autoFocus?: boolean;
		singleLine?: boolean;
	};

	/** Textarea (or `<input>` in single-line mode) wired to the mentions engine. */
	export const Input: ForwardRefExoticComponent<
		InputProps & RefAttributes<HTMLTextAreaElement | HTMLInputElement>
	> = forwardRef<HTMLTextAreaElement | HTMLInputElement, InputProps>(function MentionsInput(
		{ className, style, singleLine: singleLineProp, ...rest },
		ref,
	) {
		const ctx = useMentionsContext();
		const internalRef = ctx.textareaRef;
		const isSingleLine = singleLineProp ?? ctx.singleLine;

		const setRef = (el: HTMLTextAreaElement | HTMLInputElement | null): void => {
			(internalRef as React.MutableRefObject<HTMLTextAreaElement | null>).current =
				el as HTMLTextAreaElement | null;
			if (typeof ref === "function") ref(el);
			else if (ref)
				(ref as React.MutableRefObject<HTMLTextAreaElement | HTMLInputElement | null>).current = el;
		};

		const inputStyle: React.CSSProperties = {
			position: "relative",
			background: "transparent",
			zIndex: 1,
			...style,
		};

		const { onKeyDown: ctxOnKeyDown, ...restInputProps } = ctx.inputProps as Record<
			string,
			unknown
		>;

		const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
			if (isSingleLine && e.key === "Enter") {
				const isOpen = ctx.isOpen;
				if (isOpen) {
					(ctxOnKeyDown as (e: React.KeyboardEvent) => void)?.(e);
					return;
				}
				e.preventDefault();
				return;
			}
			(ctxOnKeyDown as (e: React.KeyboardEvent) => void)?.(e);
		};

		if (isSingleLine) {
			const { rows: _rows, ...singleLineRest } = rest;
			return (
				<input
					ref={setRef as React.Ref<HTMLInputElement>}
					type="text"
					className={className}
					style={inputStyle}
					{...singleLineRest}
					{...(restInputProps as React.InputHTMLAttributes<HTMLInputElement>)}
					onKeyDown={handleKeyDown}
				/>
			);
		}

		return (
			<textarea
				ref={setRef as React.Ref<HTMLTextAreaElement>}
				className={className}
				style={inputStyle}
				{...rest}
				{...(restInputProps as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
				onKeyDown={handleKeyDown}
			/>
		);
	});

	export type OverlayProps = {
		className?: string;
		highlightClassName?: string;
		highlightStyle?: React.CSSProperties;
	};

	function renderFormattedText(text: string): ReactNode {
		const regex = /(\*([^*]+)\*)|(_([^_]+)_)|(~([^~]+)~)/g;
		const parts: ReactNode[] = [];
		let lastIndex = 0;
		let match: RegExpExecArray | null;

		// biome-ignore lint/suspicious/noAssignInExpressions: regex exec loop
		while ((match = regex.exec(text)) !== null) {
			if (match.index > lastIndex) {
				parts.push(text.slice(lastIndex, match.index));
			}

			if (match[1]) {
				parts.push(<strong key={match.index}>{match[2]}</strong>);
			} else if (match[3]) {
				parts.push(<em key={match.index}>{match[4]}</em>);
			} else if (match[5]) {
				parts.push(<s key={match.index}>{match[6]}</s>);
			}

			lastIndex = match.index + match[0].length;
		}

		if (lastIndex < text.length) {
			parts.push(text.slice(lastIndex));
		}

		return parts.length > 0 ? parts : text;
	}

	const SYNC_PROPERTIES: string[] = [
		"direction",
		"font-family",
		"font-size",
		"font-style",
		"font-variant",
		"font-weight",
		"font-stretch",
		"font-size-adjust",
		"line-height",
		"letter-spacing",
		"word-spacing",
		"text-align",
		"text-indent",
		"text-transform",
		"text-decoration",
		"tab-size",
		"-moz-tab-size",
		"white-space",
		"word-break",
		"overflow-wrap",
		"padding-top",
		"padding-right",
		"padding-bottom",
		"padding-left",
		"border-top-width",
		"border-right-width",
		"border-bottom-width",
		"border-left-width",
		"border-top-style",
		"border-right-style",
		"border-bottom-style",
		"border-left-style",
		"box-sizing",
	];

	function syncOverlayStyles(
		textarea: HTMLTextAreaElement | HTMLInputElement,
		overlay: HTMLDivElement,
	): void {
		const computed = getComputedStyle(textarea);
		for (const prop of SYNC_PROPERTIES) {
			overlay.style.setProperty(prop, computed.getPropertyValue(prop));
		}
		overlay.style.setProperty("border-color", "transparent");
		overlay.style.setProperty("color", "transparent");
		overlay.style.setProperty("pointer-events", "none");
		overlay.style.setProperty("position", "absolute");
		overlay.style.setProperty("top", "0");
		overlay.style.setProperty("left", "0");
		overlay.style.setProperty("right", "0");
		overlay.style.setProperty("bottom", "0");
		overlay.style.setProperty("overflow", "hidden");
		overlay.style.setProperty("z-index", "0");
		overlay.style.setProperty("-webkit-text-size-adjust", "100%");
		overlay.style.setProperty("text-size-adjust", "100%");
	}

	/** Transparent overlay that renders mention highlights behind the input text. */
	export function Overlay({
		className,
		highlightClassName,
		highlightStyle,
	}: OverlayProps = {}): ReactNode {
		const ctx = useMentionsContext();
		const segments = parseMarkup(ctx.state.markup, ctx.triggers);
		const triggerMap = new Map(ctx.triggers.map((t) => [t.char, t]));

		useEffect(() => {
			const textarea = ctx.textareaRef.current;
			const overlay = ctx.overlayRef.current;
			if (!textarea || !overlay) return;

			syncOverlayStyles(textarea, overlay);

			const observer = new ResizeObserver(() => {
				syncOverlayStyles(textarea, overlay);
			});
			observer.observe(textarea);

			return () => observer.disconnect();
		}, [ctx.textareaRef, ctx.overlayRef]);

		return (
			<div
				ref={ctx.overlayRef}
				className={className}
				aria-hidden="true"
			>
				{segments.map((seg) => {
					if (seg.type === "mention") {
						const triggerConfig = triggerMap.get(seg.trigger);
						const color = triggerConfig?.color;
						return (
							<mark
								key={`seg-${seg.markupStart}`}
								className={highlightClassName}
								data-mention-type={seg.trigger}
								style={{
									backgroundColor: color ?? "var(--mention-bg, oklch(0.93 0.03 250))",
									borderRadius: "var(--mention-radius, 3px)",
									color: "transparent",
									...highlightStyle,
								}}
							>
								{seg.text}
							</mark>
						);
					}
					return <span key={`seg-${seg.markupStart}`}>{renderFormattedText(seg.text)}</span>;
				})}
				{ctx.ghostText && (
					<span
						data-ghost-text=""
						style={{
							color: "var(--ghost-text-color, rgba(0, 0, 0, 0.3))",
							pointerEvents: "none",
						}}
					>
						{ctx.ghostText}
					</span>
				)}
			</div>
		);
	}

	export type PortalProps = {
		children: ReactNode;
		container?: HTMLElement;
	};

	const MENTION_CSS_VARS = [
		"--mention-bg",
		"--mention-radius",
		"--dropdown-bg",
		"--dropdown-border",
		"--dropdown-radius",
		"--dropdown-shadow",
		"--dropdown-max-height",
		"--item-padding",
		"--item-active-bg",
		"--ghost-text-color",
	];

	function getMentionsCSSVars(textarea: HTMLElement | null): Record<string, string> {
		const container = textarea?.closest("[data-mentions]");
		if (!container) return {};

		const computed = getComputedStyle(container);
		const vars: Record<string, string> = {};
		for (const v of MENTION_CSS_VARS) {
			const val = computed.getPropertyValue(v).trim();
			if (val) vars[v] = val;
		}
		return vars;
	}

	/** Portals the suggestion dropdown to a DOM node (defaults to `document.body`). SSR-safe. */
	export function Portal({ children, container }: PortalProps): ReactNode {
		const ctx = useMentionsContext();

		if (!ctx.isOpen) return null;
		if (typeof document === "undefined") return null;

		const target = container ?? document.body;
		const textareaEl = ctx.textareaRef.current;

		const cssVars = getMentionsCSSVars(textareaEl);

		let dropdownStyle: React.CSSProperties = {
			position: "fixed",
			zIndex: 9999,
			...cssVars as React.CSSProperties,
		};

		if (textareaEl && ctx.caretPosition) {
			const rect = textareaEl.getBoundingClientRect();
			dropdownStyle = {
				...dropdownStyle,
				top: rect.top + ctx.caretPosition.top + ctx.caretPosition.height + 4,
				left: rect.left + ctx.caretPosition.left,
			};
		}

		return createPortal(
			// biome-ignore lint/a11y/noStaticElementInteractions: onMouseDown prevents textarea blur, not user interaction
			<div
				role="presentation"
				style={dropdownStyle}
				data-mentions-portal=""
				data-mentions=""
				onMouseDown={(e) => e.preventDefault()}
			>
				{children}
			</div>,
			target,
		);
	}

	export type ListProps = {
		children: ReactNode;
		className?: string;
		style?: React.CSSProperties;
	};

	/** Suggestion list container with ARIA `listbox` semantics. */
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
				{...(ctx.listProps as React.HTMLAttributes<HTMLUListElement>)}
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

	/**
	 * A single suggestion item. When `index` is omitted, renders all items automatically.
	 * Scrolls into view when highlighted.
	 */
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
		const itemProps = ctx.getItemProps(index) as React.LiHTMLAttributes<HTMLLIElement>;

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

	/** Rendered when the suggestion list has no results. */
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

	/** Rendered while an async data source is being fetched. */
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
