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
		browserName: "chromium",
	},
	projects: [
		{ name: "react", testMatch: /react-mentions\.spec\.ts$/ },
		{ name: "vue", testMatch: /vue-mentions\.spec\.ts$/ },
		{ name: "svelte", testMatch: /svelte-mentions\.spec\.ts$/ },
		{ name: "angular", testMatch: /angular-mentions\.spec\.ts$/ },
		{ name: "perf", testMatch: /perf-.*\.spec\.ts$/ },
	],
	webServer: {
		command: "pnpm build && cd website && pnpm dev",
		port: 4321,
		reuseExistingServer: !isCI,
		timeout: 120_000,
	},
});
