import type {
	ConnectReturn,
	ListScrollGeometry,
	MentionCallbacks,
	MentionItem,
	MentionState,
	TriggerConfig,
} from "@skyastrall/mentions-core";
import { getContext, setContext } from "svelte";

const MENTIONS_CTX = Symbol("MentionsContext");

export interface UseMentionsOptions {
	triggers: TriggerConfig[];
	value?: string;
	defaultValue?: string;
	onChange?: MentionCallbacks["onChange"];
	onSelect?: MentionCallbacks["onSelect"];
	onRemove?: MentionCallbacks["onRemove"];
	onQueryChange?: MentionCallbacks["onQueryChange"];
	onOpen?: MentionCallbacks["onOpen"];
	onClose?: MentionCallbacks["onClose"];
	onError?: MentionCallbacks["onError"];
	ghostText?: string;
	onAcceptGhostText?: () => void;
}

export interface MentionsContext {
	readonly state: MentionState;
	readonly aria: ConnectReturn;
	editorRef: HTMLDivElement | null;
	triggers: TriggerConfig[];
	singleLine?: boolean;
	handleInput: () => void;
	handleKeyDown: (e: KeyboardEvent) => void;
	handleBlur: (e: FocusEvent) => void;
	handleCompositionStart: () => void;
	handleCompositionEnd: () => void;
	handlePaste: (e: ClipboardEvent) => void;
	handleScroll: () => void;
	handleListScroll: (geometry: ListScrollGeometry) => void;
	loadMore: () => void;
	buildHTML: (markup: string) => string;
	performInsertion: (item: MentionItem) => void;
	clear: () => void;
	focus: () => void;
	insertTrigger: (trigger: string) => void;
	insertText: (text: string) => void;
}

export interface UseMentionsReturn {
	readonly state: MentionState;
	readonly isOpen: boolean;
	readonly isLoading: boolean;
	readonly isLoadingMore: boolean;
	readonly hasMore: boolean;
	readonly groups: ConnectReturn["groups"];
	readonly items: MentionItem[];
	readonly query: string;
	readonly highlightedIndex: number;
	readonly activeTrigger: string | null;
	readonly caretPosition: MentionState["caretPosition"];
	readonly markup: string;
	readonly plainText: string;
	readonly mentions: MentionItem[];
	readonly aria: ConnectReturn;
	editorRef: HTMLDivElement | null;
	handleInput: () => void;
	handleKeyDown: (e: KeyboardEvent) => void;
	handleBlur: (e: FocusEvent) => void;
	handleCompositionStart: () => void;
	handleCompositionEnd: () => void;
	handlePaste: (e: ClipboardEvent) => void;
	handleScroll: () => void;
	handleListScroll: (geometry: ListScrollGeometry) => void;
	loadMore: () => void;
	buildHTML: (markup: string) => string;
	performInsertion: (item: MentionItem) => void;
	clear: () => void;
	focus: () => void;
	insertTrigger: (trigger: string) => void;
	insertText: (text: string) => void;
}

export function setMentionsContext(ctx: MentionsContext): void {
	setContext(MENTIONS_CTX, ctx);
}

export function getMentionsContext(): MentionsContext {
	const ctx = getContext<MentionsContext>(MENTIONS_CTX);
	if (!ctx) {
		throw new Error("Mentions compound components must be used within <Mentions>");
	}
	return ctx;
}
