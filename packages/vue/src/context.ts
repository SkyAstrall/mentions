import type {
	ConnectReturn,
	ListScrollGeometry,
	MentionCallbacks,
	MentionItem,
	MentionState,
	TriggerConfig,
} from "@skyastrall/mentions-core";
import { type InjectionKey, inject, type Ref, type ShallowRef } from "vue";
export interface UseMentionsOptions {
	triggers: TriggerConfig[];
	modelValue?: string;
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
	state: Readonly<ShallowRef<MentionState>>;
	aria: Readonly<Ref<ConnectReturn>>;
	editorRef: ShallowRef<HTMLDivElement | null>;
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

export const MentionsKey: InjectionKey<MentionsContext> = Symbol("MentionsContext");

export function useMentionsContext(): MentionsContext {
	const ctx = inject(MentionsKey);
	if (!ctx) {
		throw new Error("Mentions compound components must be used within <Mentions>");
	}
	return ctx;
}

export interface UseMentionsReturn {
	state: Readonly<ShallowRef<MentionState>>;
	editorRef: ShallowRef<HTMLDivElement | null>;
	isOpen: Readonly<Ref<boolean>>;
	isLoading: Readonly<Ref<boolean>>;
	isLoadingMore: Readonly<Ref<boolean>>;
	hasMore: Readonly<Ref<boolean>>;
	groups: Readonly<Ref<ConnectReturn["groups"]>>;
	items: Readonly<Ref<MentionItem[]>>;
	query: Readonly<Ref<string>>;
	highlightedIndex: Readonly<Ref<number>>;
	activeTrigger: Readonly<Ref<string | null>>;
	caretPosition: Readonly<Ref<MentionState["caretPosition"]>>;
	markup: Readonly<Ref<string>>;
	plainText: Readonly<Ref<string>>;
	mentions: Readonly<Ref<MentionItem[]>>;
	aria: Readonly<Ref<ConnectReturn>>;
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
