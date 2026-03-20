import type { ConnectReturn, MentionAction, MentionState } from "./types.ts";

/**
 * Connect mention state to ARIA-compliant DOM props for the input, listbox, and option elements.
 *
 * Accepts an optional `id` to generate unique ARIA IDs when multiple instances exist on the same
 * page. If omitted, a random ID is generated.
 */
export function connect(
	state: MentionState,
	send: (action: MentionAction) => void,
	onKeyDown?: (e: KeyboardEvent) => void,
	id?: string,
): ConnectReturn {
	const instanceId = id ?? Math.random().toString(36).slice(2, 10);
	const listboxId = `mentions-listbox-${instanceId}`;
	const itemId = (index: number): string => `mention-item-${instanceId}-${index}`;

	const isOpen = state.status === "suggesting" || state.status === "navigating";
	const isLoading = state.status === "loading";

	const inputProps: Record<string, unknown> = {
		role: "combobox",
		"aria-expanded": isOpen,
		"aria-controls": isOpen ? listboxId : undefined,
		"aria-autocomplete": "list",
		"aria-activedescendant":
			isOpen && state.highlightedIndex >= 0
				? itemId(state.highlightedIndex)
				: undefined,
		"aria-haspopup": "listbox",

		onKeyDown: (e: KeyboardEvent) => {
			if (isOpen) {
				switch (e.key) {
					case "ArrowDown":
						e.preventDefault();
						send({ type: "ARROW_DOWN" });
						return;
					case "ArrowUp":
						e.preventDefault();
						send({ type: "ARROW_UP" });
						return;
					case "Enter":
					case "Tab":
						if (state.highlightedIndex >= 0 && state.items[state.highlightedIndex]) {
							e.preventDefault();
							send({ type: "SELECT", item: state.items[state.highlightedIndex] });
						}
						return;
					case "Escape":
						e.preventDefault();
						send({ type: "ESCAPE" });
						return;
				}
			}
			onKeyDown?.(e);
		},

		onCompositionStart: () => send({ type: "COMPOSITION_START" }),
		onCompositionEnd: () => send({ type: "COMPOSITION_END" }),

		onBlur: (e: FocusEvent) => {
			const container = (e.currentTarget as HTMLElement)?.parentElement;
			if (container?.contains(e.relatedTarget as Node)) return;
			send({ type: "BLUR" });
		},
	};

	const listProps: Record<string, unknown> = {
		id: listboxId,
		role: "listbox",
		"aria-label": "Suggestions",
	};

	const getItemProps = (index: number): Record<string, unknown> => ({
		id: itemId(index),
		role: "option",
		"aria-selected": index === state.highlightedIndex,
		onPointerDown: (e: PointerEvent) => {
			e.preventDefault();
		},
		onClick: () => {
			if (state.items[index]) {
				send({ type: "SELECT", item: state.items[index] });
			}
		},
	});

	return {
		inputProps,
		listProps,
		getItemProps,
		isOpen,
		query: state.query,
		items: state.items,
		highlightedIndex: state.highlightedIndex,
		activeTrigger: state.activeTrigger,
		caretPosition: state.caretPosition,
		isLoading,
	};
}
