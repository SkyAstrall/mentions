import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e",
	timeout: 30_000,
	retries: 0,
	use: {
		baseURL: "http://localhost:4321",
		headless: true,
	},
	projects: [
		{ name: "chromium", use: { browserName: "chromium" } },
	],
	webServer: {
		command: "pnpm build && cd website && pnpm dev",
		port: 4321,
		reuseExistingServer: true,
		timeout: 60_000,
	},
});
