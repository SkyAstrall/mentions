import type {
	ConnectReturn,
	MentionCallbacks,
	MentionItem,
	MentionState,
	TriggerConfig,
} from "@skyastrall/mentions-core";
import type { RefObject } from "react";
export type UseMentionsOptions = {
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
};

export type UseMentionsReturn = ConnectReturn & {
	state: MentionState;
	loadMore: () => void;
	handleListScroll: (geometry: import("@skyastrall/mentions-core").ListScrollGeometry) => void;
	editorRef: RefObject<HTMLDivElement | null>;
	markup: string;
	plainText: string;
	mentions: MentionItem[];
	clear: () => void;
	focus: () => void;
	insertTrigger: (trigger: string) => void;
	ghostText?: string;
	_buildHTML: (markup: string) => string;
	handleInput: () => void;
	inputProps: ConnectReturn["inputProps"] & {
		onKeyDown: React.KeyboardEventHandler<HTMLDivElement>;
		onCompositionStart: React.CompositionEventHandler<HTMLDivElement>;
		onCompositionEnd: React.CompositionEventHandler<HTMLDivElement>;
		onBlur: React.FocusEventHandler<HTMLDivElement>;
		onPaste: React.ClipboardEventHandler<HTMLDivElement>;
	};
	getItemProps: (index: number) => ReturnType<ConnectReturn["getItemProps"]> & {
		onPointerDown: React.PointerEventHandler;
		onClick: React.MouseEventHandler;
	};
};
