import { expect, type Locator, test } from "@playwright/test";

type Framework = "react" | "vue" | "svelte" | "angular";
const layers = ["drop-in", "compound", "headless"] as const;

async function highlighted(editor: Locator, list: Locator, label: string): Promise<void> {
	const option = list.getByRole("option", { name: label, exact: true });
	await expect(option).toHaveAttribute("aria-selected", "true");
	const id = await option.getAttribute("id");
	if (!id) throw new Error("Highlighted option must have an id");
	await expect(editor).toHaveAttribute("aria-activedescendant", id);
}

export function registerSuggestionFeatures(framework: Framework): void {
	for (const layer of layers) {
		test(`${framework} ${layer}: grouped suggestions navigate and select across headings`, async ({
			page,
		}) => {
			await page.goto(`/playground/suggestions/?fw=${framework}`);
			const root = page.locator(`#suggestions-${framework}`);
			await root.getByLabel("API layer").selectOption(layer);
			const example = root.getByTestId("grouped-suggestions");
			const editor = example.locator("[data-mentions-editor]");
			await editor.click();
			await editor.pressSequentially("@");
			const list = example.getByRole("listbox");
			await expect(list.getByRole("option")).toHaveText(["Alice", "Bob", "Platform", "general"]);
			for (const label of ["People", "Teams", "Channels"]) {
				const group = list.getByRole("group", { name: label, exact: true });
				await expect(group).toBeVisible();
				const heading = await group.evaluate((element) => {
					const id = element.getAttribute("aria-labelledby");
					const target = id ? document.getElementById(id) : null;
					return target
						? { text: target.textContent?.trim(), role: target.getAttribute("role") }
						: null;
				});
				expect(heading?.text).toBe(label);
				expect(heading?.role).not.toBe("option");
			}
			for (const label of ["Alice", "Bob", "Platform"]) {
				await editor.press("ArrowDown");
				await highlighted(editor, list, label);
			}
			await editor.press("ArrowUp");
			await highlighted(editor, list, "Bob");
			await editor.press("End");
			await highlighted(editor, list, "general");
			await editor.press("Home");
			await highlighted(editor, list, "Alice");
			await editor.press("End");
			await editor.press("Enter");
			await expect(editor.locator("mark[data-mention]")).toContainText("general");
			await expect(list).toBeHidden();
		});

		test(`${framework} ${layer}: paginated grouped data loads by keyboard and scrolling`, async ({
			page,
		}) => {
			await page.goto(`/playground/suggestions/?fw=${framework}`);
			const root = page.locator(`#suggestions-${framework}`);
			await root.getByLabel("API layer").selectOption(layer);
			const example = root.getByTestId("paginated-suggestions");
			await expect(example).toContainText("10,000");
			const editor = example.locator("[data-mentions-editor]");
			await editor.click();
			await editor.pressSequentially("@");
			const list = example.getByRole("listbox");
			await expect(list.getByRole("option")).toHaveCount(20);
			await expect(list.getByRole("group", { name: "People", exact: true })).toBeVisible();
			await page.clock.install();
			await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
			await editor.press("End");
			await highlighted(editor, list, "User 00020");
			await editor.press("ArrowDown");
			await expect(list).toHaveAttribute("aria-busy", "true");
			await expect(list.getByRole("option")).toHaveCount(20);
			await expect(example.getByRole("status")).toContainText(/loading/i);
			await highlighted(editor, list, "User 00020");
			await page.clock.runFor(1000);
			await expect(list.getByRole("option")).toHaveCount(40);
			await expect(list).not.toHaveAttribute("aria-busy", "true");
			await highlighted(editor, list, "User 00021");
			await list.evaluate((element) => {
				element.scrollTop = element.scrollHeight;
				element.dispatchEvent(new Event("scroll", { bubbles: true }));
			});
			await expect(list).toHaveAttribute("aria-busy", "true");
			await highlighted(editor, list, "User 00021");
			await page.clock.runFor(1000);
			await expect(list.getByRole("option")).toHaveCount(60);
			await highlighted(editor, list, "User 00021");
			await list.getByRole("option", { name: "User 00060", exact: true }).click();
			await expect(editor.locator("mark[data-mention]")).toContainText("User 00060");
			await expect(list).toBeHidden();
		});
	}
}
