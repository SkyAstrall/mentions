import { expect, type Locator, test } from "@playwright/test";

async function expectActiveInViewport(list: Locator, label: string): Promise<void> {
	const option = list.getByRole("option", { name: label, exact: true });
	await expect(option).toHaveAttribute("aria-selected", "true");
	await expect
		.poll(() =>
			option.evaluate((element) => {
				const listbox = element.closest('[role="listbox"]');
				if (!listbox) throw new Error("Suggestion must belong to a listbox");
				const top = listbox.getBoundingClientRect().top + listbox.clientTop;
				const bottom = top + listbox.clientHeight;
				const bounds = element.getBoundingClientRect();
				return bounds.top >= top && bounds.bottom <= bottom;
			}),
		)
		.toBe(true);
}

for (const layer of ["drop-in", "compound", "headless"]) {
	test(`angular ${layer}: keyboard navigation keeps paginated suggestions in view`, async ({
		page,
	}) => {
		await page.goto("/playground/suggestions/?fw=angular");
		const root = page.locator("#suggestions-angular");
		await root.getByLabel("API layer").selectOption(layer);
		const example = root.getByTestId("paginated-suggestions");
		const editor = example.locator("[data-mentions-editor]");
		await editor.click();
		await editor.pressSequentially("@");
		const list = example.getByRole("listbox");
		await expect(list.getByRole("option")).toHaveCount(20);
		await page.clock.install();
		await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
		await editor.press("End");
		await expectActiveInViewport(list, "User 00020");
		await editor.press("ArrowDown");
		await expect(list).toHaveAttribute("aria-busy", "true");
		await expectActiveInViewport(list, "User 00020");
		await page.clock.runFor(1000);
		await expect(list.getByRole("option")).toHaveCount(40);
		await expectActiveInViewport(list, "User 00021");
		await editor.press("ArrowUp");
		await expectActiveInViewport(list, "User 00020");
		await editor.press("Home");
		await expectActiveInViewport(list, "User 00001");
	});
}
