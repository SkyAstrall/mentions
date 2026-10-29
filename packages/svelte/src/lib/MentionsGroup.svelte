<script lang="ts">
	import type { Snippet } from "svelte";
	import { getMentionsContext } from "./context.js";
	let { index, children }: { index: number; children?: Snippet } = $props();
	const ctx = getMentionsContext();
</script>

<li role="presentation"><ul {...ctx.aria.getGroupProps(index)} style="list-style:none;padding:0;margin:0">{#if children}{@render children()}{/if}</ul></li>
