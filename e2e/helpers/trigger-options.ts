import { expect, type Locator, test } from "@playwright/test";

type Framework = "react" | "vue" | "svelte" | "angular";

async function replaceEditorText(editor: Locator, text: string): Promise<void> {
	await editor.click();
	await editor.press("ControlOrMeta+a");
	await editor.press("Backspace");
	await editor.pressSequentially(text);
}

export function registerTriggerOptionsCase(framework: Framework): void {
	test(`${framework}: respects per-trigger opening options`, async ({ page }) => {
		await page.goto(`/playground/?fw=${framework}`);
		const root = page.locator(`#playground-${framework}`);
		const editor = root.locator(
			framework === "angular"
				? '[data-mentions-editor][contenteditable="plaintext-only"]'
				: "[data-mentions-editor]",
		);
		const dropdown = root.locator("[data-mentions-portal] ul");
		await expect(editor).toBeVisible();

		await replaceEditorText(editor, "/");
		await expect(editor).toHaveAttribute("aria-expanded", "true");
		await expect(dropdown).toBeVisible();

		await replaceEditorText(editor, "intro /");
		await expect(editor).toHaveAttribute("aria-expanded", "false");
		await expect(dropdown).not.toBeVisible();

		await editor.press("Enter");
		await editor.pressSequentially("/");
		await expect(editor).toHaveAttribute("aria-expanded", "true");
		await expect(dropdown).toBeVisible();

		await replaceEditorText(editor, "(#");
		await expect(editor).toHaveAttribute("aria-expanded", "true");
		await expect(dropdown).toBeVisible();

		await replaceEditorText(editor, ".#");
		await expect(editor).toHaveAttribute("aria-expanded", "false");
		await expect(dropdown).not.toBeVisible();

		await replaceEditorText(editor, "\u4e2d#");
		await expect(editor).toHaveAttribute("aria-expanded", "false");
		await expect(dropdown).not.toBeVisible();

		await replaceEditorText(editor, "\u4e2d@");
		await expect(editor).toHaveAttribute("aria-expanded", "true");
		await expect(dropdown).toBeVisible();
	});
}
