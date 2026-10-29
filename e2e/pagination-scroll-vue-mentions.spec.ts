import { expect, test } from "@playwright/test";

for (const layer of ["drop-in", "compound"]) {
	test(`vue ${layer}: keyboard pagination scrolls the appended highlight into view`, async ({
		page,
	}) => {
		await page.goto("/playground/suggestions/?fw=vue");
		const root = page.locator("#suggestions-vue");
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
		await editor.press("ArrowDown");
		await expect(list).toHaveAttribute("aria-busy", "true");
		await page.clock.runFor(1000);
		await expect(list.getByRole("option")).toHaveCount(40);
		const option = list.getByRole("option", { name: "User 00021", exact: true });
		await expect(option).toHaveAttribute("aria-selected", "true");
		await expect
			.poll(() =>
				option.evaluate((element) => {
					const listbox = element.closest('[role="listbox"]');
					if (!listbox) throw new Error("Suggestion must belong to a listbox");
					const viewportTop = listbox.getBoundingClientRect().top + listbox.clientTop;
					const viewportBottom = viewportTop + listbox.clientHeight;
					const bounds = element.getBoundingClientRect();
					return bounds.top >= viewportTop && bounds.bottom <= viewportBottom;
				}),
			)
			.toBe(true);
	});
}
