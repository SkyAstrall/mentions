import type { ConnectReturn, ItemAriaProps, MentionState } from "./types.ts";

/**
 * Map mention state to ARIA-compliant props for the input, listbox, and option elements.
 *
 * Pure function — no side effects, no framework types. Adapters wire DOM events separately.
 *
 * ARIA follows WAI-ARIA Combobox Pattern:
 * - `aria-activedescendant` on input identifies the highlighted option
 * - `aria-busy` on listbox indicates loading state
 * - Options use `role="option"` with `aria-selected` on the highlighted item (required by VoiceOver+Chrome)
 */
export function connect(state: MentionState, id: string): ConnectReturn {
	const listboxId = `mentions-listbox-${id}`;
	const itemId = (index: number): string => `mention-item-${id}-${index}`;

	const isOpen = state.status === "suggesting" || state.status === "navigating";
	const isLoading = state.status === "loading";

	return {
		inputProps: {
			role: "combobox",
			"aria-expanded": isOpen || isLoading,
			"aria-controls": isOpen || isLoading ? listboxId : undefined,
			"aria-autocomplete": "list",
			"aria-activedescendant":
				isOpen && state.highlightedIndex >= 0 ? itemId(state.highlightedIndex) : undefined,
			"aria-haspopup": "listbox",
		},
		listProps: {
			id: listboxId,
			role: "listbox",
			"aria-label": "Suggestions",
			"aria-busy": isLoading || undefined,
		},
		getItemProps: (index: number): ItemAriaProps => ({
			id: itemId(index),
			role: "option",
			"aria-selected": index === state.highlightedIndex,
		}),
		isOpen,
		query: state.query,
		items: state.items,
		highlightedIndex: state.highlightedIndex,
		activeTrigger: state.activeTrigger,
		caretPosition: state.caretPosition,
		isLoading,
	};
}
