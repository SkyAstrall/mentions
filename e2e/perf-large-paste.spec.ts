import { expect, type Page, test } from "@playwright/test";

const PLAYGROUND = "/playground/";
const EDITOR = "#playground-react [data-mentions-editor]";

/**
 * Performance regression suite for large documents.
 *
 * Reproduces a field report: pasting ~5k lines froze the host app. The paste
 * is dispatched as a `ClipboardEvent` so the library's paste interception
 * runs exactly as it does for a user's Cmd+V; the browser's native
 * insertion path is superlinear in line count and must be bypassed above
 * the large-paste threshold. Both measurements are synchronous, so the
 * durations include every handler the library runs.
 */

type PerfResult = {
	pasteMs: number;
	keystrokeMs: number;
	pastedLength: number;
};

async function measure(page: Page, text: string): Promise<PerfResult> {
	return page.evaluate(
		([selector, content]) => {
			const el = document.querySelector(selector) as HTMLElement;
			el.focus();

			const dt = new DataTransfer();
			dt.setData("text/plain", content);
			const paste = new ClipboardEvent("paste", {
				clipboardData: dt,
				bubbles: true,
				cancelable: true,
			});

			const t0 = performance.now();
			el.dispatchEvent(paste);
			const pasteMs = performance.now() - t0;

			const pastedLength = (el.textContent ?? "").length;

			const t1 = performance.now();
			document.execCommand("insertText", false, "x");
			const keystrokeMs = performance.now() - t1;

			document.execCommand("selectAll");
			document.execCommand("delete");

			return { pasteMs, keystrokeMs, pastedLength };
		},
		[EDITOR, text] as const,
	);
}

function plainLines(count: number): string {
	return Array.from({ length: count }, (_, i) => `line ${i} lorem ipsum dolor sit amet`).join("\n");
}

/** Worst case for trigger detection: text dense with trigger characters. */
function triggerDenseLines(count: number): string {
	return Array.from(
		{ length: count },
		(_, i) => `reply to user${i}@example.com about @Component and #issue-${i} today`,
	).join("\n");
}

test.describe("large paste performance", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(PLAYGROUND);
		const ed = page.locator(EDITOR);
		await ed.click();
		// Warm the input pipeline so first-measure numbers aren't skewed by
		// the dev server's cold module compilation.
		await measure(page, plainLines(50));
		await ed.click();
		await page.keyboard.press("ControlOrMeta+a");
		await page.keyboard.press("Backspace");
	});

	test("5k plain lines: paste completes and typing stays responsive", async ({ page }) => {
		const text = plainLines(5000);
		const r = await measure(page, text);
		test.info().annotations.push({
			type: "perf",
			description: `paste=${r.pasteMs.toFixed(1)}ms keystroke=${r.keystrokeMs.toFixed(1)}ms`,
		});
		expect(r.pastedLength).toBeGreaterThanOrEqual(text.length);
		expect(r.pasteMs).toBeLessThan(500);
		expect(r.keystrokeMs).toBeLessThan(50);
	});

	test("5k trigger-dense lines: typing stays responsive", async ({ page }) => {
		const text = triggerDenseLines(5000);
		const r = await measure(page, text);
		test.info().annotations.push({
			type: "perf",
			description: `paste=${r.pasteMs.toFixed(1)}ms keystroke=${r.keystrokeMs.toFixed(1)}ms`,
		});
		expect(r.pastedLength).toBeGreaterThanOrEqual(text.length);
		expect(r.pasteMs).toBeLessThan(500);
		expect(r.keystrokeMs).toBeLessThan(50);
	});

	test("dropdown still opens after a 5k-line paste", async ({ page }) => {
		await page.evaluate(
			([selector, content]) => {
				const el = document.querySelector(selector) as HTMLElement;
				el.focus();
				const dt = new DataTransfer();
				dt.setData("text/plain", content);
				el.dispatchEvent(
					new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }),
				);
			},
			[EDITOR, `${plainLines(5000)}\n`] as const,
		);
		await page.keyboard.type("@al");
		await expect(page.locator("[data-mentions-portal] ul")).toBeVisible({ timeout: 5000 });
	});

	test("Cmd+Z undoes a large paste in one step", async ({ page }) => {
		const ed = page.locator(EDITOR);
		await ed.click();
		await page.keyboard.type("before ");
		await page.evaluate(
			([selector, content]) => {
				const el = document.querySelector(selector) as HTMLElement;
				el.focus();
				const dt = new DataTransfer();
				dt.setData("text/plain", content);
				el.dispatchEvent(
					new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }),
				);
			},
			[EDITOR, plainLines(2000)] as const,
		);
		await expect(ed).toContainText("line 1999");
		await page.keyboard.press("ControlOrMeta+z");
		await expect(ed).toHaveText("before ");
	});
});
