import type { MentionItem } from "@skyastrall/mentions-core";
import { type CSSProperties, defineComponent, h, type PropType, ref, Teleport, watch } from "vue";
import { useMentionsContext } from "./context.js";

export const MentionsGroup = defineComponent({
	props: { index: { type: Number, required: true } },
	setup(props, { slots }) {
		const ctx = useMentionsContext();
		return () =>
			h("li", { role: "presentation" }, [
				h(
					"ul",
					{
						...ctx.aria.value.getGroupProps(props.index),
						style: { listStyle: "none", padding: 0 },
					},
					slots.default?.(),
				),
			]);
	},
});

export const MentionsGroupLabel = defineComponent({
	props: { index: { type: Number, required: true } },
	setup(props) {
		const ctx = useMentionsContext();
		return () =>
			h(
				"li",
				{
					role: "presentation",
					...ctx.aria.value.getGroupLabelProps(props.index),
					style: { padding: "8px 12px", fontWeight: 600 },
				},
				ctx.aria.value.groups[props.index]?.label ?? undefined,
			);
	},
});

export const MentionsSuggestions = defineComponent({
	props: {
		renderItem: {
			type: Function as PropType<(item: MentionItem, highlighted: boolean) => unknown>,
		},
	},
	setup(props) {
		const ctx = useMentionsContext();
		return () => {
			const api = ctx.aria.value;
			const itemNode = (item: MentionItem, index: number) =>
				h(
					MentionsItem,
					{ key: item.id, index },
					{
						default: () =>
							props.renderItem
								? props.renderItem(item, index === api.highlightedIndex)
								: item.label,
					},
				);
			const nodes = api.groups.length
				? api.groups.flatMap((group, index) => {
						const items = () =>
							group.items.map((item, offset) => itemNode(item, group.startIndex + offset));
						return group.id === null
							? items()
							: [
									h(
										MentionsGroup,
										{ index, key: group.id },
										{ default: () => [h(MentionsGroupLabel, { index }), ...items()] },
									),
								];
					})
				: api.items.map(itemNode);
			if (api.isLoadingMore) nodes.push(h("li", { role: "status" }, "Loading..."));
			return nodes;
		};
	},
});
export const MentionsPortal = defineComponent({
	name: "MentionsPortal",
	props: {
		to: { type: [String, Object] as PropType<string | HTMLElement>, default: undefined },
	},
	setup(props, { slots }) {
		const ctx = useMentionsContext();

		return () => {
			if (!ctx.aria.value.isOpen && !ctx.aria.value.isLoading) return null;

			const dropdownStyle: CSSProperties = {
				position: "fixed",
				zIndex: 9999,
			};

			const cp = ctx.state.value.caretPosition;
			if (cp) {
				dropdownStyle.top = `${cp.top + cp.height + 4}px`;
				dropdownStyle.left = `${cp.left}px`;
			}

			const content = h(
				"div",
				{
					role: "presentation",
					style: dropdownStyle,
					"data-mentions-portal": "",
					"data-mentions": "",
					onMousedown: (e: MouseEvent) => e.preventDefault(),
				},
				slots.default?.(),
			);

			return props.to ? h(Teleport, { to: props.to }, { default: () => content }) : content;
		};
	},
});

export const MentionsList = defineComponent({
	name: "MentionsList",
	props: {
		class: { type: String, default: undefined },
	},
	setup(props, { slots }) {
		const ctx = useMentionsContext();

		return () =>
			h(
				"ul",
				{
					class: props.class,
					...ctx.aria.value.listProps,
					onScroll: (event: Event) => ctx.handleListScroll(event.currentTarget as HTMLElement),
					style: {
						listStyle: "none",
						margin: 0,
						padding: "4px 0",
						maxHeight: "var(--dropdown-max-height, 240px)",
						overflowY: "auto",
						backgroundColor: "var(--dropdown-bg, white)",
						border: "var(--dropdown-border, 1px solid #e2e8f0)",
						borderRadius: "var(--dropdown-radius, 8px)",
						boxShadow: "var(--dropdown-shadow, 0 4px 12px rgba(0,0,0,0.08))",
						minWidth: "200px",
					} as CSSProperties,
				},
				slots.default?.(),
			);
	},
});

export const MentionsItem = defineComponent({
	name: "MentionsItem",
	props: {
		index: { type: Number, required: true },
		class: { type: String, default: undefined },
	},
	setup(props, { slots }) {
		const ctx = useMentionsContext();
		const itemEl = ref<HTMLLIElement | null>(null);

		const highlighted = (): boolean => props.index === ctx.state.value.highlightedIndex;

		watch(
			[itemEl, () => props.index, () => ctx.state.value.highlightedIndex],
			() => {
				if (highlighted() && itemEl.value) {
					itemEl.value.scrollIntoView({ block: "nearest" });
				}
			},
			{ flush: "post" },
		);

		return () => {
			const item = ctx.state.value.items[props.index];
			if (!item) return null;

			const ariaItemProps = ctx.aria.value.getItemProps(props.index);

			return h(
				"li",
				{
					ref: itemEl,
					class: props.class,
					...ariaItemProps,
					onPointerdown: (e: PointerEvent) => e.preventDefault(),
					onClick: () => ctx.performInsertion(item),
					style: {
						padding: "var(--item-padding, 8px 12px)",
						cursor: "pointer",
						backgroundColor: highlighted() ? "var(--item-active-bg, #f1f5f9)" : "transparent",
					} as CSSProperties,
				},
				slots.default?.({ item, highlighted: highlighted() }) ?? item.label,
			);
		};
	},
});

export const MentionsEmpty = defineComponent({
	name: "MentionsEmpty",
	setup(_, { slots }) {
		const ctx = useMentionsContext();

		return () => {
			if (ctx.state.value.items.length > 0) return null;
			return h(
				"div",
				{
					style: {
						padding: "var(--item-padding, 8px 12px)",
						color: "#94a3b8",
						fontSize: "0.875rem",
					} as CSSProperties,
				},
				slots.default?.(),
			);
		};
	},
});

export const MentionsLoading = defineComponent({
	name: "MentionsLoading",
	setup(_, { slots }) {
		return () =>
			h(
				"div",
				{
					style: {
						padding: "var(--item-padding, 8px 12px)",
						color: "#94a3b8",
						fontSize: "0.875rem",
					} as CSSProperties,
				},
				slots.default?.(),
			);
	},
});
