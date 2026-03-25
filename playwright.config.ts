import { defineConfig } from "@playwright/test";

const isCI = !!process.env.CI;

export default defineConfig({
	testDir: "./e2e",
	timeout: 30_000,
	retries: isCI ? 2 : 0,
	workers: isCI ? 1 : undefined,
	reporter: isCI ? "blob" : "html",
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
		reuseExistingServer: !isCI,
		timeout: 120_000,
	},
});
