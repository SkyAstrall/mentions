import { type TriggerConfig, Mentions, useMentions } from "@skyastrall/mentions-react";
import { useState } from "react";
import { groupedTriggers, paginatedTriggers } from "../../data/suggestion-examples";

function Headless({ triggers }: { triggers: TriggerConfig[] }) {
	const api = useMentions({ triggers });
	const item = (index: number) => <div key={api.items[index].id} {...api.getItemProps(index)}>{api.items[index].label}</div>;
	return <div data-mentions="">
		<div ref={api.editorRef} {...api.inputProps} contentEditable suppressContentEditableWarning data-mentions-editor="" onInput={api.handleInput} tabIndex={0} />
		{(api.isOpen || api.isLoading) && <div {...api.listProps} onScroll={(event) => api.handleListScroll(event.currentTarget)}>
			{api.groups.length ? api.groups.map((group, index) => group.id === null
				? group.items.map((_, offset) => item(group.startIndex + offset))
				: <div key={group.id} {...api.getGroupProps(index)}><div {...api.getGroupLabelProps(index)}>{group.label}</div>{group.items.map((_, offset) => item(group.startIndex + offset))}</div>)
				: api.items.map((_, index) => item(index))}
			{(api.isLoading || api.isLoadingMore) && <div role="status">Loading...</div>}
		</div>}
	</div>;
}

function Example({ layer, triggers }: { layer: string; triggers: TriggerConfig[] }) {
	if (layer === "headless") return <Headless triggers={triggers} />;
	if (layer === "compound") return <Mentions triggers={triggers}>
		<Mentions.Editor /><Mentions.Portal><Mentions.List><Mentions.Suggestions /></Mentions.List></Mentions.Portal>
	</Mentions>;
	return <Mentions triggers={triggers} />;
}

export default function SuggestionFeatures() {
	const [layer, setLayer] = useState("drop-in");
	return <div>
		<label>API layer <select value={layer} onChange={(event) => setLayer(event.target.value)}><option value="drop-in">Drop-in</option><option value="compound">Compound</option><option value="headless">Headless</option></select></label>
		<section data-testid="grouped-suggestions"><h2>People / Teams / Channels</h2><p>Type @ to explore grouped suggestions.</p><Example key={`groups-${layer}`} layer={layer} triggers={groupedTriggers} /></section>
		<section data-testid="paginated-suggestions"><h2>10,000 synthetic users</h2><p>20 results per page. Type @, then scroll or use ArrowDown to load more.</p><Example key={`pages-${layer}`} layer={layer} triggers={paginatedTriggers} /></section>
	</div>;
}
