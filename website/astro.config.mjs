import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import vue from "@astrojs/vue";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
	site: "https://mentions.skyastrall.com",
	output: "static",

	integrations: [react({ include: ["**/react/**"] }), vue({ include: ["**/*.vue"] })],

	vite: {
		plugins: [tailwindcss()],
	},
});
