<script setup lang="ts">
import { ref } from "vue";
import { groupedTriggers, paginatedTriggers } from "../../data/suggestion-examples";
import SuggestionExample from "./SuggestionExample.vue";
const layer = ref("drop-in");
</script>

<template>

<div>
	<label>API layer <select v-model="layer"><option value="drop-in">Drop-in</option><option value="compound">Compound</option><option value="headless">Headless</option></select></label>
	<section data-testid="grouped-suggestions"><h2>People / Teams / Channels</h2><p>Type @ to explore grouped suggestions.</p><SuggestionExample :key="`groups-${layer}`" :layer="layer" :triggers="groupedTriggers" /></section>
	<section data-testid="paginated-suggestions"><h2>10,000 synthetic users</h2><p>20 results per page. Type @, then scroll or use ArrowDown to load more.</p><SuggestionExample :key="`pages-${layer}`" :layer="layer" :triggers="paginatedTriggers" /></section>
</div>
</template>
