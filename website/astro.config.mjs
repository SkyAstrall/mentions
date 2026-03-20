import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
	site: "https://mentions.skyastrall.com",
	output: "static",

	integrations: [react()],

	vite: {
		plugins: [tailwindcss()],
	},
});
