export const editorStyles = `:host {
	display: block;
}
[data-mentions-editor] {
	outline: none;
	min-height: 1.5em;
	white-space: pre-wrap;
	overflow-wrap: break-word;
}
[data-mentions-editor][data-singleline] {
	white-space: nowrap;
	overflow: hidden;
	overflow-x: auto;
	min-height: 0;
}
[data-mentions-editor][data-singleline] br {
	display: none;
}
[data-mentions-editor][data-empty]::before {
	content: attr(data-placeholder);
	color: var(--mention-placeholder, var(--color-text-dim, #9ca3af));
	pointer-events: none;
	float: left;
	height: 0;
}
.sa-mentions-list {
	list-style: none;
	margin: 0;
	padding: 4px 0;
	max-height: var(--dropdown-max-height, 240px);
	overflow-y: auto;
	background: var(--dropdown-bg, white);
	border: var(--dropdown-border, 1px solid #e2e8f0);
	border-radius: var(--dropdown-radius, 8px);
	box-shadow: var(--dropdown-shadow, 0 4px 12px rgba(0, 0, 0, 0.08));
	min-width: 200px;
}
.sa-mentions-item {
	padding: var(--item-padding, 8px 12px);
	cursor: pointer;
}
.sa-mentions-item--active {
	background: var(--item-active-bg, #f1f5f9);
}
.sa-mentions-empty {
	padding: var(--item-padding, 8px 12px);
	color: #94a3b8;
	font-size: 0.875rem;
	list-style: none;
}
`;
