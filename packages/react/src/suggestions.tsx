"use client";
import type { MentionItem } from "@skyastrall/mentions-core";
import { type ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useMentionsContext } from "./context.js";

export function Group({ index, children }: { index: number; children?: ReactNode }): ReactNode {
	const ctx = useMentionsContext();
	return (
		<li role="presentation">
			<ul {...ctx.getGroupProps(index)} style={{ listStyle: "none", padding: 0 }}>
				{children}
			</ul>
		</li>
	);
}

export function GroupLabel({ index }: { index: number }): ReactNode {
	const ctx = useMentionsContext();
	return (
		<li
			role="presentation"
			{...ctx.getGroupLabelProps(index)}
			style={{ padding: "8px 12px", fontWeight: 600 }}
		>
			{ctx.groups[index]?.label}
		</li>
	);
}

export function Suggestions({
	renderItem,
}: {
	renderItem?: (item: MentionItem, highlighted: boolean) => ReactNode;
}): ReactNode {
	const ctx = useMentionsContext();
	const render = (item: MentionItem, index: number) => (
		<Item key={item.id} index={index}>
			{renderItem ? renderItem(item, index === ctx.highlightedIndex) : item.label}
		</Item>
	);
	return (
		<>
			{ctx.groups.length
				? ctx.groups.map((group, index) =>
						group.id === null ? (
							group.items.map((item, offset) => render(item, group.startIndex + offset))
						) : (
							<Group key={group.id} index={index}>
								<GroupLabel index={index} />
								{group.items.map((item, offset) => render(item, group.startIndex + offset))}
							</Group>
						),
					)
				: ctx.items.map(render)}
			{ctx.isLoadingMore && <li role="status">Loading...</li>}
		</>
	);
}
export type PortalProps = {
	children: ReactNode;
	container?: HTMLElement;
};

export function Portal({ children, container }: PortalProps): ReactNode {
	const ctx = useMentionsContext();

	if (!ctx.isOpen) return null;
	if (typeof document === "undefined") return null;

	let dropdownStyle: React.CSSProperties = {
		position: "fixed",
		zIndex: 9999,
	};

	if (ctx.caretPosition) {
		dropdownStyle = {
			...dropdownStyle,
			top: ctx.caretPosition.top + ctx.caretPosition.height + 4,
			left: ctx.caretPosition.left,
		};
	}

	const content = (
		// biome-ignore lint/a11y/noStaticElementInteractions: onMouseDown prevents blur
		<div
			role="presentation"
			style={dropdownStyle}
			data-mentions-portal=""
			data-mentions=""
			onMouseDown={(e) => e.preventDefault()}
		>
			{children}
		</div>
	);

	if (container) {
		return createPortal(content, container);
	}

	return content;
}

export type ListProps = {
	children: ReactNode;
	className?: string;
	style?: React.CSSProperties;
};

export function List({ children, className, style }: ListProps): ReactNode {
	const ctx = useMentionsContext();

	return (
		<ul
			className={className}
			style={{
				listStyle: "none",
				margin: 0,
				padding: "4px 0",
				maxHeight: "var(--dropdown-max-height, 240px)",
				overflowY: "auto",
				backgroundColor: "var(--dropdown-bg, white)",
				border: "var(--dropdown-border, 1px solid #e2e8f0)",
				borderRadius: "var(--dropdown-radius, 8px)",
				boxShadow: "var(--dropdown-shadow, 0 4px 12px rgba(0,0,0,0.08))",
				minWidth: 200,
				...style,
			}}
			{...ctx.listProps}
			onScroll={(event) => ctx.handleListScroll(event.currentTarget)}
		>
			{children}
		</ul>
	);
}

export type ItemProps = {
	index?: number;
	children?: ReactNode;
	className?: string;
	style?: React.CSSProperties;
	render?: (props: { item: MentionItem; highlighted: boolean }) => ReactNode;
};

export function Item({ index, children, className, style, render }: ItemProps): ReactNode {
	if (index === undefined) {
		return (
			<ItemMapper className={className} style={style} render={render}>
				{children}
			</ItemMapper>
		);
	}

	return (
		<ItemSingle index={index} className={className} style={style} render={render}>
			{children}
		</ItemSingle>
	);
}

function ItemMapper({ children, className, style, render }: Omit<ItemProps, "index">): ReactNode {
	const ctx = useMentionsContext();
	return (
		<>
			{ctx.items.map((item, i) => (
				<ItemSingle key={item.id} index={i} className={className} style={style} render={render}>
					{children}
				</ItemSingle>
			))}
		</>
	);
}

function ItemSingle({
	index,
	children,
	className,
	style,
	render,
}: ItemProps & { index: number }): ReactNode {
	const ctx = useMentionsContext();
	const itemRef = useRef<HTMLLIElement>(null);

	const item = ctx.items[index];
	const highlighted = index === ctx.highlightedIndex;
	const itemProps = ctx.getItemProps(index);

	useEffect(() => {
		if (highlighted && itemRef.current) {
			itemRef.current.scrollIntoView({ block: "nearest" });
		}
	}, [highlighted]);

	if (!item) return null;

	return (
		<li
			ref={itemRef}
			className={className}
			style={{
				padding: "var(--item-padding, 8px 12px)",
				cursor: "pointer",
				backgroundColor: highlighted ? "var(--item-active-bg, #f1f5f9)" : "transparent",
				...style,
			}}
			{...itemProps}
		>
			{render ? render({ item, highlighted }) : (children ?? item.label)}
		</li>
	);
}

export type EmptyProps = {
	children: ReactNode;
	className?: string;
	style?: React.CSSProperties;
};

export function Empty({ children, className, style }: EmptyProps): ReactNode {
	const ctx = useMentionsContext();
	if (ctx.items.length > 0) return null;

	return (
		<div
			className={className}
			style={{
				padding: "var(--item-padding, 8px 12px)",
				color: "#94a3b8",
				fontSize: "0.875rem",
				...style,
			}}
		>
			{children}
		</div>
	);
}

export type LoadingProps = {
	children: ReactNode;
	className?: string;
	style?: React.CSSProperties;
};

export function Loading({ children, className, style }: LoadingProps): ReactNode {
	return (
		<div
			className={className}
			style={{
				padding: "var(--item-padding, 8px 12px)",
				color: "#94a3b8",
				fontSize: "0.875rem",
				...style,
			}}
		>
			{children}
		</div>
	);
}
