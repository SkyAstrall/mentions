import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import svelte from "@astrojs/svelte";
import vue from "@astrojs/vue";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
	site: "https://mentions.skyastrall.com",
	output: "static",

	integrations: [
		react({ include: ["**/react/**"] }),
		vue({ include: ["**/*.vue"] }),
		svelte({ include: ["**/*.svelte"] }),
	],

	vite: {
		plugins: [tailwindcss()],
	},
});
