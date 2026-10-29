<script lang="ts">
	import { getMentionsContext } from "./context.js";
	let { index }: { index: number } = $props();
	const ctx = getMentionsContext();
</script>

<li role="presentation" {...ctx.aria.getGroupLabelProps(index)} style="padding:8px 12px;font-weight:600">{ctx.aria.groups[index]?.label}</li>
