import type { MentionAction, MentionState } from "./types.ts";

/** Default initial state for the mention state machine. */
export const initialState: MentionState = {
	status: "idle",
	activeTrigger: null,
	query: "",
	queryStartIndex: 0,
	queryEndIndex: 0,
	items: [],
	highlightedIndex: -1,
	markup: "",
	plainText: "",
	selectionStart: 0,
	selectionEnd: 0,
	caretPosition: null,
	isComposing: false,
};

/** Create an initial state with optional overrides. */
export function createInitialState(overrides?: Partial<MentionState>): MentionState {
	return { ...initialState, ...overrides };
}

/** Pure reducer for the mention state machine. Handles all mention lifecycle actions. */
export function mentionReducer(state: MentionState, action: MentionAction): MentionState {
	switch (action.type) {
		case "INPUT_CHANGE":
			return {
				...state,
				markup: action.markup,
				plainText: action.plainText,
				selectionStart: action.selectionStart,
				selectionEnd: action.selectionEnd,
			};

		case "TRIGGER_MATCH":
			return {
				...state,
				status: state.status === "idle" ? "suggesting" : state.status,
				activeTrigger: action.trigger,
				query: action.query,
				queryStartIndex: action.startIndex,
				queryEndIndex: action.endIndex,
				highlightedIndex: state.status === "idle" ? -1 : state.highlightedIndex,
			};

		case "QUERY_CHANGE":
			return {
				...state,
				status: "suggesting",
				query: action.query,
				queryEndIndex: action.endIndex,
				highlightedIndex: -1,
			};

		case "TRIGGER_LOST":
			return {
				...state,
				status: "idle",
				activeTrigger: null,
				query: "",
				queryStartIndex: 0,
				queryEndIndex: 0,
				items: [],
				highlightedIndex: -1,
				caretPosition: null,
			};

		case "FETCH_START":
			return { ...state, status: "loading" };

		case "FETCH_COMPLETE":
			return {
				...state,
				status: "suggesting",
				items: action.items,
				highlightedIndex: -1,
			};

		case "FETCH_ERROR":
			return {
				...state,
				status: "idle",
				items: [],
				activeTrigger: null,
				query: "",
				highlightedIndex: -1,
				caretPosition: null,
			};

		case "ARROW_DOWN": {
			if (state.items.length === 0) return state;
			const next = (state.highlightedIndex + 1) % state.items.length;
			return { ...state, status: "navigating", highlightedIndex: next };
		}

		case "ARROW_UP": {
			if (state.items.length === 0) return state;
			const prev =
				state.highlightedIndex <= 0
					? state.items.length - 1
					: state.highlightedIndex - 1;
			return { ...state, status: "navigating", highlightedIndex: prev };
		}

		case "SELECT":
			return {
				...state,
				status: "idle",
				activeTrigger: null,
				query: "",
				queryStartIndex: 0,
				queryEndIndex: 0,
				items: [],
				highlightedIndex: -1,
				caretPosition: null,
			};

		case "INSERT_COMPLETE":
			return {
				...state,
				status: "idle",
				activeTrigger: null,
				query: "",
				queryStartIndex: 0,
				queryEndIndex: 0,
				items: [],
				highlightedIndex: -1,
				caretPosition: null,
				markup: action.markup,
				plainText: action.plainText,
				selectionStart: action.cursor,
				selectionEnd: action.cursor,
			};

		case "ESCAPE":
		case "BLUR":
			return {
				...state,
				status: "idle",
				activeTrigger: null,
				query: "",
				items: [],
				highlightedIndex: -1,
				caretPosition: null,
			};

		case "COMPOSITION_START":
			return { ...state, isComposing: true };

		case "COMPOSITION_END":
			return { ...state, isComposing: false };

		case "CARET_POSITION":
			return { ...state, caretPosition: action.position };

		default:
			return state;
	}
}
