<script lang="ts">
	import { groupedTriggers, paginatedTriggers } from "../../data/suggestion-examples";
	import SuggestionExample from "./SuggestionExample.svelte";
	let layer = $state("drop-in");
</script>

<div>
	<label>API layer <select bind:value={layer}><option value="drop-in">Drop-in</option><option value="compound">Compound</option><option value="headless">Headless</option></select></label>
	<section data-testid="grouped-suggestions"><h2>People / Teams / Channels</h2><p>Type @ to explore grouped suggestions.</p>{#key layer}<SuggestionExample {layer} triggers={groupedTriggers} />{/key}</section>
	<section data-testid="paginated-suggestions"><h2>10,000 synthetic users</h2><p>20 results per page. Type @, then scroll or use ArrowDown to load more.</p>{#key layer}<SuggestionExample {layer} triggers={paginatedTriggers} />{/key}</section>
</div>
