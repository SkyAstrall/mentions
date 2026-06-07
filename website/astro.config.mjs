import angular from "@analogjs/astro-angular";
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
		angular({
			vite: {
				transformFilter: (_code, id) =>
					id.includes("components/angular") || id.includes("mentions-angular"),
			},
		}),
		{
			// @analogjs/astro-angular forces esbuild jsxDev:true globally, which
			// breaks the React island in production builds (analogjs/analog#1148).
			// Angular templates use no JSX, so switch it back off after angular().
			name: "restore-jsx-prod",
			hooks: {
				"astro:config:setup": ({ updateConfig }) => {
					updateConfig({ vite: { esbuild: { jsxDev: false } } });
				},
			},
		},

	],

	vite: {
		plugins: [tailwindcss()],
		ssr: {
			// Partial-Ivy Angular libraries must be linked by the Angular vite
			// plugin during SSR instead of being imported as-is from node_modules.
			noExternal: ["@skyastrall/mentions-angular"],
		},
	},
});
