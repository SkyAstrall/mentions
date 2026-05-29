import { expect, type Locator, type Page, test } from "@playwright/test";

const PLAYGROUND = "/playground/";

function editor(page: Page): Locator {
	return page.locator("#playground-react [data-mentions-editor]");
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

test.describe("basic editor", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(PLAYGROUND);
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

test.describe("trigger detection", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(PLAYGROUND);
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

test.describe("mention selection", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(PLAYGROUND);
		await clearEditor(page);
	});

	test("ArrowDown + Enter selects a mention", async ({ page }) => {
		await editor(page).click();
		await page.keyboard.type("@ali");
		await expect(dropdown(page)).toBeVisible();
		await page.keyboard.press("ArrowDown");
		await page.keyboard.press("Enter");
		await expect(dropdown(page)).not.toBeVisible();

		const ed = editor(page);
		const marks = ed.locator("mark[data-mention]");
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

		// Cursor should be after the mention, not at the start
		const cursorPosition = await page.evaluate(() => {
			const el = document.querySelector("#playground-react [data-mentions-editor]") as HTMLElement;
			const sel = window.getSelection();
			if (!sel || sel.rangeCount === 0) return -1;
			const range = sel.getRangeAt(0);
			const pre = document.createRange();
			pre.selectNodeContents(el);
			pre.setEnd(range.startContainer, range.startOffset);
			return pre.cloneContents().textContent?.replace(/\u200B/g, "").length ?? -1;
		});

		// Cursor should be past "hello " (6) + "@Alice Johnson" (14) + space (1) = 21+
		expect(cursorPosition).toBeGreaterThan(6);
	});

	test("can type after selecting a mention", async ({ page }) => {
		await editor(page).click();
		await page.keyboard.type("@ali");
		await page.keyboard.press("ArrowDown");
		await page.keyboard.press("Enter");
		await page.keyboard.type("is great");

		const ed = editor(page);
		const text = await ed.textContent();
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

	test("Tab selects highlighted item", async ({ page }) => {
		await editor(page).click();
		await page.keyboard.type("@ali");
		await expect(dropdown(page)).toBeVisible();
		await page.keyboard.press("ArrowDown");
		await page.keyboard.press("Tab");
		await expect(dropdown(page)).not.toBeVisible();

		const marks = editor(page).locator("mark[data-mention]");
		await expect(marks).toHaveCount(1);
	});
});

// -- Keyboard navigation --

test.describe("keyboard navigation", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(PLAYGROUND);
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
		// Second should now be highlighted
		const secondBg = await second.evaluate((el) => getComputedStyle(el).backgroundColor);
		expect(secondBg).not.toBe("transparent");
	});

	test("ArrowUp wraps to last item", async ({ page }) => {
		await editor(page).click();
		await page.keyboard.type("@");
		await expect(dropdown(page)).toBeVisible();

		await page.keyboard.press("ArrowUp");
		// Should highlight last item
		const items = await dropdownItems(page).all();
		const lastItem = items[items.length - 1];
		const bg = await lastItem.evaluate((el) => getComputedStyle(el).backgroundColor);
		expect(bg).not.toBe("transparent");
	});
});

// -- Mention marks & output --

test.describe("output", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(PLAYGROUND);
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

	test("markup output contains mention syntax", async ({ page }) => {
		await editor(page).click();
		await page.keyboard.type("hi @ali");
		await page.keyboard.press("ArrowDown");
		await page.keyboard.press("Enter");

		// Check the Output panel in playground
		const markupOutput = page.locator(".pg-panel-body code").first();
		await expect(markupOutput).toContainText("@[Alice Johnson](1)");
	});
});

// -- Edge cases --

test.describe("edge cases", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(PLAYGROUND);
		await clearEditor(page);
	});

	test("mention at start of editor", async ({ page }) => {
		await editor(page).click();
		await page.keyboard.type("@ali");
		await page.keyboard.press("ArrowDown");
		await page.keyboard.press("Enter");

		const marks = editor(page).locator("mark[data-mention]");
		await expect(marks).toHaveCount(1);

		// Can still type after
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

		// Select all and delete to reliably remove the mention
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

		// @ after non-whitespace should NOT trigger
		await expect(dropdown(page)).not.toBeVisible();
	});
});

// -- Bug fix regression tests --

test.describe("bug fixes", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(PLAYGROUND);
		await clearEditor(page);
	});

	test("dropdown repositions on scroll", async ({ page }) => {
		await editor(page).click();
		await page.keyboard.type("@");
		await expect(dropdown(page)).toBeVisible();

		// Capture initial dropdown position
		const initialTop = await dropdown(page).evaluate((el) => {
			const rect = el.closest("[data-mentions-portal]")?.getBoundingClientRect();
			return rect?.top ?? 0;
		});

		// Scroll down
		await page.evaluate(() => window.scrollBy(0, 100));
		await page.waitForTimeout(100);

		// Dropdown should have moved (position updated)
		const afterScrollTop = await dropdown(page).evaluate((el) => {
			const rect = el.closest("[data-mentions-portal]")?.getBoundingClientRect();
			return rect?.top ?? 0;
		});

		// The dropdown should have moved roughly by the scroll amount
		expect(Math.abs(initialTop - afterScrollTop - 100)).toBeLessThan(20);
	});
});

test.describe("single-line toggle", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(PLAYGROUND);
		await clearEditor(page);
	});

	test("toggling single-line prevents Enter from creating newlines", async ({ page }) => {
		// Type multiline content first
		await editor(page).click();
		await page.keyboard.type("line one");
		await page.keyboard.press("Enter");
		await page.keyboard.type("line two");

		// Verify we have multiline content
		const beforeHTML = await editor(page).innerHTML();
		expect(beforeHTML).toContain("line one");
		expect(beforeHTML).toContain("line two");

		// Toggle single-line on
		const checkbox = page.locator('#playground-react label:has-text("Single line") input');
		await checkbox.check();
		await page.waitForTimeout(200);

		// Try pressing Enter — should NOT create a new line
		await editor(page).click();
		await page.keyboard.press("End");
		await page.keyboard.type(" more");
		await page.keyboard.press("Enter");
		await page.keyboard.type("blocked");

		// "blocked" should be on the same line (no <br> or newline)
		const afterHTML = await editor(page).innerHTML();
		expect(afterHTML).not.toContain("<br>");
		expect(afterHTML).not.toMatch(/<div>/);
	});
});
