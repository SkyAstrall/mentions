import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react()],
	resolve: {
		dedupe: ["react", "react-dom"],
	},
	optimizeDeps: {
		exclude: ["@skyastrall/mentions-core", "@skyastrall/mentions-react"],
	},
});
