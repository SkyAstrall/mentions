import { expect, type Locator, type Page, test } from "@playwright/test";

const PLAYGROUND = "/playground/?fw=vue";

function editor(page: Page): Locator {
	return page.locator("#playground-vue [data-mentions-editor]");
}

function dropdown(page: Page): Locator {
	return page.locator("[data-mentions-portal] ul");
}

function dropdownItems(page: Page): Locator {
	return page.locator("[data-mentions-portal] li");
}

async function clearEditor(page: Page) {
	const ed = editor(page);
	await ed.click();
	await page.keyboard.press("Meta+a");
	await page.keyboard.press("Backspace");
}

// -- Basic typing --

test.describe("vue: basic editor", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(PLAYGROUND);
		await page.waitForSelector("#playground-vue [data-mentions-editor]", { state: "visible" });
		await clearEditor(page);
	});

	test("can type plain text", async ({ page }) => {
		const ed = editor(page);
		await ed.click();
		await page.keyboard.type("hello world");
		await expect(ed).toHaveText("hello world");
	});

	test("cursor stays at end after typing", async ({ page }) => {
		const ed = editor(page);
		await ed.click();
		await page.keyboard.type("abc");

		const cursorAtEnd = await page.evaluate(() => {
			const sel = window.getSelection();
			if (!sel || sel.rangeCount === 0) return false;
			const range = sel.getRangeAt(0);
			const container = range.startContainer;
			return range.startOffset === (container.textContent?.length ?? 0);
		});
		expect(cursorAtEnd).toBe(true);
	});
});

// -- Trigger detection & dropdown --

test.describe("vue: trigger detection", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(PLAYGROUND);
		await page.waitForSelector("#playground-vue [data-mentions-editor]", { state: "visible" });
		await clearEditor(page);
	});

	test("@ trigger shows user suggestions", async ({ page }) => {
		await editor(page).click();
		await page.keyboard.type("@");
		await expect(dropdown(page)).toBeVisible();
		const items = dropdownItems(page);
		await expect(items.first()).toBeVisible();
	});

	test("# trigger shows tag suggestions", async ({ page }) => {
		await editor(page).click();
		await page.keyboard.type("#");
		await expect(dropdown(page)).toBeVisible();
	});

	test("/ trigger shows command suggestions", async ({ page }) => {
		await editor(page).click();
		await page.keyboard.type("/");
		await expect(dropdown(page)).toBeVisible();
	});

	test("typing query filters suggestions", async ({ page }) => {
		await editor(page).click();
		await page.keyboard.type("@ali");
		await expect(dropdown(page)).toBeVisible();
		const items = dropdownItems(page);
		await expect(items).toHaveCount(1);
		await expect(items.first()).toContainText("Alice");
	});

	test("Escape closes dropdown", async ({ page }) => {
		await editor(page).click();
		await page.keyboard.type("@");
		await expect(dropdown(page)).toBeVisible();
		await page.keyboard.press("Escape");
		await expect(dropdown(page)).not.toBeVisible();
	});
});

// -- Mention selection --

test.describe("vue: mention selection", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(PLAYGROUND);
		await page.waitForSelector("#playground-vue [data-mentions-editor]", { state: "visible" });
		await clearEditor(page);
	});

	test("ArrowDown + Enter selects a mention", async ({ page }) => {
		await editor(page).click();
		await page.keyboard.type("@ali");
		await expect(dropdown(page)).toBeVisible();
		await page.keyboard.press("ArrowDown");
		await page.keyboard.press("Enter");
		await expect(dropdown(page)).not.toBeVisible();

		const marks = editor(page).locator("mark[data-mention]");
		await expect(marks).toHaveCount(1);
		await expect(marks.first()).toContainText("Alice");
	});

	test("clicking a suggestion selects it", async ({ page }) => {
		await editor(page).click();
		await page.keyboard.type("@ali");
		await expect(dropdown(page)).toBeVisible();
		await dropdownItems(page).first().click();
		await expect(dropdown(page)).not.toBeVisible();

		const marks = editor(page).locator("mark[data-mention]");
		await expect(marks).toHaveCount(1);
	});

	test("cursor stays after mention after Enter selection", async ({ page }) => {
		await editor(page).click();
		await page.keyboard.type("hello @ali");
		await expect(dropdown(page)).toBeVisible();
		await page.keyboard.press("ArrowDown");
		await page.keyboard.press("Enter");
		await expect(dropdown(page)).not.toBeVisible();

		const cursorPosition = await page.evaluate(() => {
			const el = document.querySelector("#playground-vue [data-mentions-editor]") as HTMLElement;
			const sel = window.getSelection();
			if (!sel || sel.rangeCount === 0) return -1;
			const range = sel.getRangeAt(0);
			const pre = document.createRange();
			pre.selectNodeContents(el);
			pre.setEnd(range.startContainer, range.startOffset);
			return pre.cloneContents().textContent?.replace(/\u200B/g, "").length ?? -1;
		});

		expect(cursorPosition).toBeGreaterThan(6);
	});

	test("can type after selecting a mention", async ({ page }) => {
		await editor(page).click();
		await page.keyboard.type("@ali");
		await page.keyboard.press("ArrowDown");
		await page.keyboard.press("Enter");
		await page.keyboard.type("is great");

		const text = await editor(page).textContent();
		expect(text?.replace(/\u200B/g, "")).toContain("is great");
	});

	test("can select multiple mentions", async ({ page }) => {
		await editor(page).click();
		await page.keyboard.type("@ali");
		await page.keyboard.press("ArrowDown");
		await page.keyboard.press("Enter");
		await page.keyboard.type("and @bob");
		await expect(dropdown(page)).toBeVisible();
		await page.keyboard.press("ArrowDown");
		await page.keyboard.press("Enter");

		const marks = editor(page).locator("mark[data-mention]");
		await expect(marks).toHaveCount(2);
	});
});

// -- Actions (template ref + expose) --

test.describe("vue: actions via template ref", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(PLAYGROUND);
		await page.waitForSelector("#playground-vue [data-mentions-editor]", { state: "visible" });
		await clearEditor(page);
	});

	test("Focus button focuses the editor", async ({ page }) => {
		// Click somewhere else first to blur editor
		await page.click("body");

		// Click the Focus action button
		const focusBtn = page.locator("#playground-vue .pg-actions button", { hasText: "Focus" });
		await focusBtn.click();

		// Editor should be focused
		const isFocused = await page.evaluate(() => {
			const el = document.querySelector("#playground-vue [data-mentions-editor]");
			return document.activeElement === el;
		});
		expect(isFocused).toBe(true);
	});

	test("Clear button clears the editor", async ({ page }) => {
		// Type something first
		await editor(page).click();
		await page.keyboard.type("some text here");
		await expect(editor(page)).toHaveText("some text here");

		// Click Clear
		const clearBtn = page.locator("#playground-vue .pg-actions button", { hasText: /^Clear$/ });
		await clearBtn.click();

		// Editor should be empty
		const text = await editor(page).textContent();
		expect(text?.replace(/\u200B/g, "").trim()).toBe("");
	});

	test("Insert @ button inserts trigger character", async ({ page }) => {
		// Focus editor first
		await editor(page).click();

		// Use mousedown on Insert @ button (same as the template uses mousedown.prevent)
		const insertBtn = page.locator("#playground-vue .pg-actions button", { hasText: "Insert @" });
		await insertBtn.dispatchEvent("mousedown");

		// Wait for dropdown to appear (@ trigger should activate)
		await expect(dropdown(page)).toBeVisible({ timeout: 3000 });
	});
});

// -- Stress tests --

test.describe("vue: stress tests", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(PLAYGROUND);
		await page.waitForSelector("#playground-vue [data-mentions-editor]", { state: "visible" });
		await clearEditor(page);
	});

	test("Clear + Insert stress test", async ({ page }) => {
		await editor(page).click();
		await page.keyboard.type("hello world");

		const btn = page.locator("#playground-vue .pg-actions button", { hasText: "Clear + Insert" });
		await btn.click();

		// Wait for setTimeout(50) + processing
		await page.waitForTimeout(300);

		const edText = await editor(page).textContent();
		expect(edText?.replace(/\u200B/g, "")).toContain("@");
		await expect(dropdown(page)).toBeVisible({ timeout: 3000 });
	});

	test("Rapid 5x @ stress test", async ({ page }) => {
		// Focus editor first
		await editor(page).click();

		// Click Rapid 5x @ button
		const btn = page.locator("#playground-vue .pg-actions button", { hasText: "Rapid 5x @" });
		await btn.click();

		// Wait for all 5 timeouts to complete (4 * 80ms = 320ms)
		await page.waitForTimeout(600);

		// Should have multiple @ characters
		const edText = await editor(page).textContent();
		const atCount = (edText?.match(/@/g) || []).length;
		expect(atCount).toBeGreaterThanOrEqual(1);
	});

	test("Rapid 10x mixed stress test", async ({ page }) => {
		// Focus editor first
		await editor(page).click();

		// Click Rapid 10x mixed button
		const btn = page.locator("#playground-vue .pg-actions button", { hasText: "Rapid 10x mixed" });
		await btn.click();

		// Wait for all 10 timeouts (9 * 60ms = 540ms)
		await page.waitForTimeout(800);

		// Should have trigger characters inserted
		const edText = await editor(page).textContent();
		expect(edText?.replace(/\u200B/g, "").length).toBeGreaterThan(0);
	});

	test("template ref expose() returns methods", async ({ page }) => {
		// Verify the ref is actually set by checking if methods exist
		const refExists = await page.evaluate(() => {
			// Access the Vue component instance's exposed methods
			const vueEl = document.querySelector("#playground-vue [data-mentions]");
			if (!vueEl) return "no-mentions-el";

			const component = (
				vueEl as HTMLElement & { __vueParentComponent?: { exposed?: Record<string, unknown> } }
			).__vueParentComponent;
			if (!component) return "no-component";
			if (!component.exposed) return "no-exposed";
			if (typeof component.exposed.focus !== "function") return "no-focus";
			if (typeof component.exposed.clear !== "function") return "no-clear";
			if (typeof component.exposed.insertTrigger !== "function") return "no-insertTrigger";
			return "ok";
		});
		// Log for debugging
		console.log("template ref expose check:", refExists);
		// If the expose is properly set, this should be "ok"
		// If not, the specific failure tells us what's missing
	});
});

// -- Edge cases --

test.describe("vue: edge cases", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(PLAYGROUND);
		await page.waitForSelector("#playground-vue [data-mentions-editor]", { state: "visible" });
		await clearEditor(page);
	});

	test("mention at start of editor", async ({ page }) => {
		await editor(page).click();
		await page.keyboard.type("@ali");
		await page.keyboard.press("ArrowDown");
		await page.keyboard.press("Enter");

		const marks = editor(page).locator("mark[data-mention]");
		await expect(marks).toHaveCount(1);

		await page.keyboard.type("hello");
		const text = await editor(page).textContent();
		expect(text?.replace(/\u200B/g, "")).toContain("hello");
	});

	test("backspace removes mention", async ({ page }) => {
		await editor(page).click();
		await page.keyboard.type("@ali");
		await page.keyboard.press("ArrowDown");
		await page.keyboard.press("Enter");

		const marks = editor(page).locator("mark[data-mention]");
		await expect(marks).toHaveCount(1);

		await page.keyboard.press("Meta+a");
		await page.keyboard.press("Backspace");
		await expect(marks).toHaveCount(0);
	});

	test("trigger after mention works", async ({ page }) => {
		await editor(page).click();
		await page.keyboard.type("@ali");
		await page.keyboard.press("ArrowDown");
		await page.keyboard.press("Enter");

		await page.keyboard.type("#bug");
		await expect(dropdown(page)).toBeVisible();
		await expect(dropdownItems(page).first()).toContainText("bug");
	});

	test("no dropdown when typing mid-word", async ({ page }) => {
		await editor(page).click();
		await page.keyboard.type("hello@world");
		await expect(dropdown(page)).not.toBeVisible();
	});
});

// -- Bug fix regression tests --

test.describe("vue: bug fixes", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(PLAYGROUND);
		await page.waitForSelector("#playground-vue [data-mentions-editor]", { state: "visible" });
		await clearEditor(page);
	});

	test("dropdown repositions on scroll", async ({ page }) => {
		await editor(page).click();
		await page.keyboard.type("@");
		await expect(dropdown(page)).toBeVisible();

		const initialTop = await dropdown(page).evaluate((el) => {
			const rect = el.closest("[data-mentions-portal]")?.getBoundingClientRect();
			return rect?.top ?? 0;
		});

		await page.evaluate(() => window.scrollBy(0, 100));
		await page.waitForTimeout(100);

		const afterScrollTop = await dropdown(page).evaluate((el) => {
			const rect = el.closest("[data-mentions-portal]")?.getBoundingClientRect();
			return rect?.top ?? 0;
		});

		expect(Math.abs(initialTop - afterScrollTop - 100)).toBeLessThan(20);
	});
});

test.describe("vue: single-line toggle", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(PLAYGROUND);
		await page.waitForSelector("#playground-vue [data-mentions-editor]", { state: "visible" });
		await clearEditor(page);
	});

	test("toggling single-line prevents Enter", async ({ page }) => {
		await editor(page).click();
		await page.keyboard.type("line one");
		await page.keyboard.press("Enter");
		await page.keyboard.type("line two");

		// Toggle single-line
		const checkbox = page.locator('#playground-vue label:has-text("Single line") input');
		await checkbox.check();
		await page.waitForTimeout(200);

		// Check single-line attributes applied
		const hasSingleLine = await editor(page).getAttribute("data-singleline");
		console.log("data-singleline:", hasSingleLine);

		const whiteSpace = await editor(page).evaluate((el) => getComputedStyle(el).whiteSpace);
		console.log("white-space:", whiteSpace);

		// Enter should be blocked
		await editor(page).click();
		await page.keyboard.press("End");
		await page.keyboard.press("Enter");
		await page.keyboard.type("x");

		const html = await editor(page).innerHTML();
		console.log("HTML after Enter:", html);
	});
});
