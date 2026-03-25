/** A mention candidate with an ID and display label. */
export type MentionItem<TData extends Record<string, unknown> = Record<string, unknown>> = {
	id: string;
	label: string;
} & TData;

/** Contextual information passed to async data fetchers. */
export type MentionContext = {
	textBefore: string;
	textAfter: string;
	activeMentions: MentionItem[];
	fullText: string;
};

/** Configuration for a single trigger character (e.g. `@`, `#`, `/`). */
export type TriggerConfig = {
	char: string;
	data: MentionItem[] | ((query: string, context: MentionContext) => Promise<MentionItem[]>);
	markup?: string;
	allowSpaceInQuery?: boolean;
	minChars?: number;
	debounce?: number;
	maxSuggestions?: number;
	color?: string;
};

export type Segment = TextSegment | MentionSegment;

export type TextSegment = {
	type: "text";
	text: string;
	markupStart: number;
	markupEnd: number;
};

export type MentionSegment = {
	type: "mention";
	text: string;
	id: string;
	trigger: string;
	markupStart: number;
	markupEnd: number;
};

export type CaretPosition = {
	top: number;
	left: number;
	height: number;
};

export type MachineStatus = "idle" | "suggesting" | "navigating" | "loading";

/** Full state of the mention state machine. */
export type MentionState = {
	status: MachineStatus;
	activeTrigger: string | null;
	query: string;
	queryStartIndex: number;
	queryEndIndex: number;
	items: MentionItem[];
	highlightedIndex: number;
	markup: string;
	plainText: string;
	selectionStart: number;
	selectionEnd: number;
	caretPosition: CaretPosition | null;
	isComposing: boolean;
};

/** Actions dispatched to the mention state machine. */
export type MentionAction =
	| {
			type: "INPUT_CHANGE";
			markup: string;
			plainText: string;
			selectionStart: number;
			selectionEnd: number;
	  }
	| { type: "TRIGGER_MATCH"; trigger: string; query: string; startIndex: number; endIndex: number }
	| { type: "TRIGGER_LOST" }
	| { type: "FETCH_START" }
	| { type: "FETCH_COMPLETE"; items: MentionItem[] }
	| { type: "FETCH_ERROR" }
	| { type: "ARROW_DOWN" }
	| { type: "ARROW_UP" }
	| { type: "HOME" }
	| { type: "END" }
	| { type: "SELECT"; item: MentionItem }
	| { type: "ESCAPE" }
	| { type: "BLUR" }
	| { type: "COMPOSITION_START" }
	| { type: "COMPOSITION_END" }
	| { type: "CARET_POSITION"; position: CaretPosition }
	| { type: "INSERT_COMPLETE"; markup: string; plainText: string; cursor: number };

/** Callback hooks for mention lifecycle events. */
export type MentionCallbacks = {
	onSelect?: (item: MentionItem, trigger: string) => void;
	onRemove?: (item: MentionItem, trigger: string) => void;
	onChange?: (markup: string, plainText: string) => void;
	onQueryChange?: (query: string, trigger: string) => void;
	onOpen?: (trigger: string) => void;
	onClose?: () => void;
	onError?: (error: Error) => void;
};

/** ARIA attributes for the combobox input element. */
export type InputAriaProps = {
	role: "combobox";
	"aria-expanded": boolean;
	"aria-controls"?: string;
	"aria-autocomplete": "list";
	"aria-activedescendant"?: string;
	"aria-haspopup": "listbox";
};

/** ARIA attributes for the listbox element. */
export type ListAriaProps = {
	id: string;
	role: "listbox";
	"aria-label": string;
	"aria-busy"?: boolean;
};

/** ARIA attributes for a single listbox option. */
export type ItemAriaProps = {
	id: string;
	role: "option";
	"aria-selected": boolean;
};

/** Return value of the `connect()` function with ARIA props and derived state. */
export type ConnectReturn = {
	inputProps: InputAriaProps;
	listProps: ListAriaProps;
	getItemProps: (index: number) => ItemAriaProps;
	isOpen: boolean;
	query: string;
	items: MentionItem[];
	highlightedIndex: number;
	activeTrigger: string | null;
	caretPosition: CaretPosition | null;
	isLoading: boolean;
};

/** Result of a keyboard interaction with the controller. */
export type KeyDownResult =
	| { handled: true; action: "select"; item: MentionItem }
	| { handled: true }
	| { handled: false };

/** Options for creating a MentionController instance. */
export type MentionControllerOptions = {
	triggers: TriggerConfig[];
	initialMarkup?: string;
	callbacks?: MentionCallbacks;
	filterFn?: (items: MentionItem[], query: string) => MentionItem[];
};
