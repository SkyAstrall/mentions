import { defineConfig } from "tsdown";
import Vue from "unplugin-vue/rolldown";

export default defineConfig({
	entry: ["./src/index.ts"],
	format: "esm",
	platform: "neutral",
	target: "es2022",
	dts: false,
	clean: true,
	sourcemap: true,
	plugins: [Vue({ isProduction: true })],
});
