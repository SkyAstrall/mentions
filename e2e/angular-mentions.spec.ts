import { expect, type Locator, type Page, test } from "@playwright/test";

const PLAYGROUND = "/playground/?fw=angular";
const ROOT = "#playground-angular";

/**
 * The angular island hydrates by bootstrapping over the server-rendered DOM.
 * `contenteditable="plaintext-only"` is only ever set client-side, so its
 * presence is the signal that the live component has replaced the SSR shell.
 */
const EDITOR = `${ROOT} [data-mentions-editor][contenteditable="plaintext-only"]`;

function editor(page: Page): Locator {
	return page.locator(EDITOR);
}

function dropdown(page: Page): Locator {
	return page.locator(`${ROOT} [data-mentions-portal] ul`);
}

function dropdownItems(page: Page): Locator {
	return page.locator(`${ROOT} [data-mentions-portal] li`);
}

function outputRow(page: Page, label: string): Locator {
	return page.locator(`${ROOT} .pg-panel-body div`, { hasText: label }).locator("code");
}

test.beforeEach(async ({ page }) => {
	await page.goto(PLAYGROUND);
	await page.waitForSelector(EDITOR);
	const ed = editor(page);
	await ed.click();
	await page.keyboard.press("ControlOrMeta+a");
	await page.keyboard.press("Backspace");
});

test.describe("angular: basic editing", () => {
	test("typing plain text flows through ngModel", async ({ page }) => {
		await editor(page).click();
		await page.keyboard.type("hello angular");
		await expect(outputRow(page, "Markup")).toHaveText("hello angular");
		await expect(outputRow(page, "Plain text")).toHaveText("hello angular");
	});

	test("@ trigger opens the dropdown", async ({ page }) => {
		await editor(page).click();
		await page.keyboard.type("@");
		await expect(dropdown(page)).toBeVisible();
	});

	test("typing a query filters suggestions", async ({ page }) => {
		await editor(page).click();
		await page.keyboard.type("@ali");
		await expect(dropdown(page)).toBeVisible();
		await expect(dropdownItems(page)).toHaveCount(1);
	});

	test("Escape closes the dropdown", async ({ page }) => {
		await editor(page).click();
		await page.keyboard.type("@");
		await expect(dropdown(page)).toBeVisible();
		await page.keyboard.press("Escape");
		await expect(dropdown(page)).not.toBeVisible();
	});
});

test.describe("angular: mention lifecycle", () => {
	test("ArrowDown + Enter inserts a mention and updates the form value", async ({ page }) => {
		await editor(page).click();
		await page.keyboard.type("ping @ali");
		await expect(dropdown(page)).toBeVisible();
		await page.keyboard.press("ArrowDown");
		await page.keyboard.press("Enter");

		await expect(editor(page).locator("mark[data-mention]")).toHaveCount(1);
		await expect(outputRow(page, "Markup")).toContainText("ping @[Alice Johnson](");
		await expect(outputRow(page, "Plain text")).toContainText("ping @Alice Johnson");
		await expect(outputRow(page, "Mentions")).toContainText("Alice Johnson");
		await expect(page.locator(`${ROOT} .pg-event`).first()).toContainText("select @Alice Johnson");
	});

	test("deleting a mention fires mentionRemove", async ({ page }) => {
		await editor(page).click();
		await page.keyboard.type("@ali");
		await page.keyboard.press("ArrowDown");
		await page.keyboard.press("Enter");
		await expect(editor(page).locator("mark[data-mention]")).toHaveCount(1);

		await page.keyboard.press("ControlOrMeta+a");
		await page.keyboard.press("Backspace");
		await expect(page.locator(`${ROOT} .pg-event`).first()).toContainText("remove @Alice Johnson");
	});

	test("trigger opens on a fresh line after Enter", async ({ page }) => {
		await editor(page).click();
		await page.keyboard.type("line1");
		await page.keyboard.press("Enter");
		await page.keyboard.type("@al");
		await expect(dropdown(page)).toBeVisible();
	});
});

test.describe("angular: configuration", () => {
	test("custom trigger added through the sidebar works in the editor", async ({ page }) => {
		await page.locator(`${ROOT} .pg-input[placeholder*="comma"]`).fill("rocket, star");
		await page.locator(`${ROOT} button:has-text("Add trigger")`).click();
		await expect(page.locator(`${ROOT} .pg-trigger-row`)).toHaveCount(4);

		await editor(page).click();
		await page.keyboard.type("!ro");
		await expect(dropdown(page)).toBeVisible();
		await expect(dropdownItems(page).first()).toContainText("rocket");
	});

	test("generated code reflects the single-line toggle", async ({ page }) => {
		await page.locator(`${ROOT} label:has-text("Single line") input`).check();
		await expect(page.locator(`${ROOT} .pg-code code`)).toContainText("[singleLine]");
	});

	test("single line suppresses Enter newlines", async ({ page }) => {
		await page.locator(`${ROOT} label:has-text("Single line") input`).check();
		await editor(page).click();
		await page.keyboard.type("one");
		await page.keyboard.press("Enter");
		await page.keyboard.type("two");
		await expect(outputRow(page, "Plain text")).toHaveText("onetwo");
	});

	test("disabled blocks editing", async ({ page }) => {
		await page.locator(`${ROOT} label:has-text("Disabled") input`).check();
		await expect(
			page.locator(`${ROOT} [data-mentions-editor][contenteditable="false"]`),
		).toBeVisible();
	});

	test("read-only blocks editing", async ({ page }) => {
		await page.locator(`${ROOT} label:has-text("Read only") input`).check();
		await expect(
			page.locator(`${ROOT} [data-mentions-editor][contenteditable="false"]`),
		).toBeVisible();
	});
});

test.describe("angular: actions", () => {
	test("Insert @ opens the dropdown", async ({ page }) => {
		await page.locator(`${ROOT} button:has-text("Insert @")`).click();
		await expect(dropdown(page)).toBeVisible();
	});

	test("Clear empties the editor and form value", async ({ page }) => {
		await editor(page).click();
		await page.keyboard.type("wipe me");
		await expect(outputRow(page, "Markup")).toHaveText("wipe me");
		await page.locator(`${ROOT} .pg-actions button`, { hasText: /^Clear$/ }).click();
		await expect(editor(page)).toHaveText("");
	});
});

test.describe("angular: large paste", () => {
	test("5k-line paste stays fast and dropdown still works", async ({ page }) => {
		const pasteMs = await page.evaluate(
			([selector]) => {
				const el = document.querySelector(selector) as HTMLElement;
				el.focus();
				const text = `${Array.from({ length: 5000 }, (_, i) => `line ${i} lorem ipsum`).join("\n")}\n`;
				const dt = new DataTransfer();
				dt.setData("text/plain", text);
				const t0 = performance.now();
				el.dispatchEvent(
					new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }),
				);
				return performance.now() - t0;
			},
			[EDITOR] as const,
		);
		expect(pasteMs).toBeLessThan(800);
		await page.keyboard.type("@al");
		await expect(dropdown(page)).toBeVisible({ timeout: 5000 });
	});
});
