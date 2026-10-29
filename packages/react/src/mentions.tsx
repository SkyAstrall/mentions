"use client";

import {
	insertLargeText,
	insertTextAtCursor,
	isLargePaste,
	type MentionItem,
	type TriggerConfig,
} from "@skyastrall/mentions-core";
import { forwardRef, type ReactNode, useImperativeHandle, useMemo } from "react";
import { MentionsContext, type MentionsContextValue } from "./context.js";
import { Editor } from "./editor.js";
import {
	Empty,
	Group,
	GroupLabel,
	Item,
	List,
	Loading,
	Portal,
	Suggestions,
} from "./suggestions.js";
import { useMentions } from "./use-mentions.js";

export type { EditorProps } from "./editor.js";
export type { EmptyProps, ItemProps, ListProps, LoadingProps, PortalProps } from "./suggestions.js";

export type MentionsHandle = {
	focus: () => void;
	clear: () => void;
	getValue: () => { markup: string; plainText: string };
	insertTrigger: (trigger: string) => void;
	insertText: (text: string) => void;
};

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
	ghostText?: string;
	onAcceptGhostText?: () => void;
};

const MentionsImpl = (
	{
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
		ghostText,
		onAcceptGhostText,
	}: MentionsProps,
	ref: React.ForwardedRef<MentionsHandle>,
): ReactNode => {
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
			insertText: (text: string) => {
				const el = api.editorRef.current;
				if (!el) return;
				el.focus();
				const sel = window.getSelection();
				if (sel && sel.rangeCount === 0) {
					const range = document.createRange();
					range.selectNodeContents(el);
					range.collapse(false);
					sel.addRange(range);
				}
				// Both branches fire an input event, so the pipeline runs once.
				if (isLargePaste(text)) {
					insertLargeText(el, text);
				} else {
					insertTextAtCursor(text);
				}
			},
		}),
		[api.focus, api.clear, api.markup, api.plainText, api.insertTrigger, api.editorRef],
	);

	// Individual deps instead of `api` object (which has a new identity every render).
	// Stable useCallback functions (clear, focus, etc.) don't need to be listed — they
	// only change if `controller` changes, which is once. The deps that actually change
	// are state-derived values: markup, items, highlighting, open state, caret position.
	// biome-ignore lint/correctness/useExhaustiveDependencies: api is spread but we list individual state-derived props as deps — api object has a new identity every render
	const ctx = useMemo<MentionsContextValue>(
		() => ({ ...api, triggers, singleLine }),
		[
			api.state,
			api.isOpen,
			api.isLoading,
			api.items,
			api.query,
			api.highlightedIndex,
			api.activeTrigger,
			api.caretPosition,
			api.markup,
			api.plainText,
			api.mentions,
			api.ghostText,
			triggers,
			singleLine,
		],
	);

	if (!children) {
		return (
			<MentionsContext.Provider value={ctx}>
				<div data-mentions="" style={{ position: "relative" }}>
					<Editor
						className={className}
						placeholder={placeholder}
						disabled={disabled}
						readOnly={readOnly}
						autoFocus={autoFocus}
						singleLine={singleLine}
					/>
					{(api.isOpen || api.isLoading) && (
						<Portal>
							<List>
								{api.isLoading ? (
									<Loading>Loading...</Loading>
								) : api.items.length === 0 ? (
									<Empty>No results</Empty>
								) : (
									<Suggestions renderItem={renderItem} />
								)}
							</List>
						</Portal>
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
};

const MentionsRoot = forwardRef<MentionsHandle, MentionsProps>(MentionsImpl);
MentionsRoot.displayName = "Mentions";

type MentionsComponent = React.ForwardRefExoticComponent<
	MentionsProps & React.RefAttributes<MentionsHandle>
> & {
	Editor: typeof Editor;
	Portal: typeof Portal;
	List: typeof List;
	Item: typeof Item;
	Empty: typeof Empty;
	Loading: typeof Loading;
	Group: typeof Group;
	GroupLabel: typeof GroupLabel;
	Suggestions: typeof Suggestions;
};

/**
 * Drop-in mentions editor. Renders a complete editor + dropdown by default,
 * or acts as the context provider for compound usage
 * (`<Mentions.Editor>`, `<Mentions.List>`, ...).
 *
 * Wrapped in `forwardRef` so the imperative `MentionsHandle` works on both
 * React 18 and 19.
 */
export const Mentions: MentionsComponent = Object.assign(MentionsRoot, {
	Editor,
	Portal,
	List,
	Item,
	Empty,
	Loading,
	Group,
	GroupLabel,
	Suggestions,
});
