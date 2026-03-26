import { expect, type Locator, type Page, test } from "@playwright/test";

const PLAYGROUND = "/playground/?fw=svelte";

function editor(page: Page): Locator {
	return page.locator("#playground-svelte [data-mentions-editor]");
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

test.describe("svelte: basic editor", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(PLAYGROUND);
		await page.waitForSelector("#playground-svelte [data-mentions-editor]", { state: "visible" });
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

test.describe("svelte: trigger detection", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(PLAYGROUND);
		await page.waitForSelector("#playground-svelte [data-mentions-editor]", { state: "visible" });
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

test.describe("svelte: mention selection", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(PLAYGROUND);
		await page.waitForSelector("#playground-svelte [data-mentions-editor]", { state: "visible" });
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
			const el = document.querySelector("#playground-svelte [data-mentions-editor]") as HTMLElement;
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

// -- Keyboard navigation --

test.describe("svelte: keyboard navigation", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(PLAYGROUND);
		await page.waitForSelector("#playground-svelte [data-mentions-editor]", { state: "visible" });
		await clearEditor(page);
	});

	test("ArrowDown highlights items sequentially", async ({ page }) => {
		await editor(page).click();
		await page.keyboard.type("@");
		await expect(dropdown(page)).toBeVisible();

		await page.keyboard.press("ArrowDown");
		const first = dropdownItems(page).first();
		await expect(first).toHaveCSS("background-color", /[^transparent]/);

		await page.keyboard.press("ArrowDown");
		const second = dropdownItems(page).nth(1);
		const secondBg = await second.evaluate((el) => getComputedStyle(el).backgroundColor);
		expect(secondBg).not.toBe("transparent");
	});

	test("ArrowUp wraps to last item", async ({ page }) => {
		await editor(page).click();
		await page.keyboard.type("@");
		await expect(dropdown(page)).toBeVisible();

		await page.keyboard.press("ArrowUp");
		const items = await dropdownItems(page).all();
		const lastItem = items[items.length - 1];
		const bg = await lastItem.evaluate((el) => getComputedStyle(el).backgroundColor);
		expect(bg).not.toBe("transparent");
	});
});

// -- Mention marks & output --

test.describe("svelte: output", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(PLAYGROUND);
		await page.waitForSelector("#playground-svelte [data-mentions-editor]", { state: "visible" });
		await clearEditor(page);
	});

	test("mention mark has correct data attributes", async ({ page }) => {
		await editor(page).click();
		await page.keyboard.type("@ali");
		await page.keyboard.press("ArrowDown");
		await page.keyboard.press("Enter");

		const mark = editor(page).locator("mark[data-mention]").first();
		await expect(mark).toHaveAttribute("data-mention", "@");
		await expect(mark).toHaveAttribute("data-id", "1");
		await expect(mark).toHaveAttribute("contenteditable", "false");
	});
});

// -- Edge cases --

test.describe("svelte: edge cases", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(PLAYGROUND);
		await page.waitForSelector("#playground-svelte [data-mentions-editor]", { state: "visible" });
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

test.describe("svelte: bug fixes", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(PLAYGROUND);
		await page.waitForSelector("#playground-svelte [data-mentions-editor]", { state: "visible" });
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
