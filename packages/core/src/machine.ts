import type { MentionAction, MentionState } from "./types.ts";

/** Default initial state for the mention state machine. */
const initialState: MentionState = {
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

const idleReset = {
	status: "idle" as const,
	activeTrigger: null,
	query: "",
	queryStartIndex: 0,
	queryEndIndex: 0,
	items: [],
	highlightedIndex: -1,
	caretPosition: null,
};

/**
 * Pure reducer for the mention state machine with state-scoped transitions.
 *
 * Actions not valid in the current status are no-ops (return unchanged state).
 * This prevents impossible states like FETCH_COMPLETE after ESCAPE.
 */
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

		case "TRIGGER_LOST":
			return { ...state, ...idleReset };

		case "FETCH_START":
			if (state.status !== "suggesting" && state.status !== "navigating") return state;
			return { ...state, status: "loading" };

		case "FETCH_COMPLETE":
			if (state.status !== "loading" && state.status !== "suggesting") return state;
			return {
				...state,
				status: "suggesting",
				items: action.items,
				highlightedIndex: -1,
			};

		case "FETCH_ERROR":
			if (state.status !== "loading") return state;
			return { ...state, ...idleReset };

		case "ARROW_DOWN": {
			if (state.status !== "suggesting" && state.status !== "navigating") return state;
			if (state.items.length === 0) return state;
			const next = (state.highlightedIndex + 1) % state.items.length;
			return { ...state, status: "navigating", highlightedIndex: next };
		}

		case "ARROW_UP": {
			if (state.status !== "suggesting" && state.status !== "navigating") return state;
			if (state.items.length === 0) return state;
			const prev =
				state.highlightedIndex <= 0 ? state.items.length - 1 : state.highlightedIndex - 1;
			return { ...state, status: "navigating", highlightedIndex: prev };
		}

		case "HOME":
			if (state.status !== "suggesting" && state.status !== "navigating") return state;
			if (state.items.length === 0) return state;
			return { ...state, status: "navigating", highlightedIndex: 0 };

		case "END":
			if (state.status !== "suggesting" && state.status !== "navigating") return state;
			if (state.items.length === 0) return state;
			return { ...state, status: "navigating", highlightedIndex: state.items.length - 1 };

		case "SELECT":
			if (state.status !== "suggesting" && state.status !== "navigating") return state;
			return { ...state, ...idleReset };

		case "INSERT_COMPLETE":
			return {
				...state,
				...idleReset,
				markup: action.markup,
				plainText: action.plainText,
				selectionStart: action.cursor,
				selectionEnd: action.cursor,
			};

		case "ESCAPE":
		case "BLUR":
			if (state.status === "idle") return state;
			return { ...state, ...idleReset };

		case "COMPOSITION_START":
			return state.isComposing ? state : { ...state, isComposing: true };

		case "COMPOSITION_END":
			return state.isComposing ? { ...state, isComposing: false } : state;

		case "CARET_POSITION":
			return { ...state, caretPosition: action.position };

		default:
			return state;
	}
}
