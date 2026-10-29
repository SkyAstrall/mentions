import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { connect } from "./connect.ts";
import { MentionController } from "./controller.ts";
import type { MentionItem, TriggerConfig } from "./types.ts";

const people = [
	{ id: "p1", label: "Alice", group: "people" },
	{ id: "p2", label: "Bob", group: "people" },
];
const team = { id: "t1", label: "Platform", group: "teams" };
const channel = { id: "c1", label: "general", group: "channels" };
const items: MentionItem[] = [team, people[0], channel, people[1]];
const groups = [
	{ id: "people", label: "People" },
	{ id: "teams", label: "Teams" },
	{ id: "channels", label: "Channels" },
	{ id: "empty", label: "Empty" },
];
const controllers: MentionController[] = [];

function create(trigger: TriggerConfig): MentionController {
	const controller = new MentionController({ triggers: [trigger] });
	controllers.push(controller);
	return controller;
}

function open(controller: MentionController): void {
	controller.handleInputChange("@", "@", 1);
}

function view(controller: MentionController) {
	return connect(controller.getState(), "groups-acceptance");
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
	for (const controller of controllers.splice(0)) controller.destroy();
	vi.useRealTimers();
});

describe("grouped suggestions", () => {
	it.each([false, true])("orders and labels groups for async=%s", async (asyncMode) => {
		const controller = create({
			char: "@",
			data: asyncMode ? async () => items : items,
			groups,
			debounce: 0,
		});
		open(controller);
		await vi.advanceTimersByTimeAsync(0);
		const api = view(controller);
		expect(api.items.map((item) => item.id)).toEqual(["p1", "p2", "t1", "c1"]);
		expect(
			api.groups.map((group) => [group.id, group.label, group.startIndex, group.items.length]),
		).toEqual([
			["people", "People", 0, 2],
			["teams", "Teams", 2, 1],
			["channels", "Channels", 3, 1],
		]);
		for (let index = 0; index < api.groups.length; index++) {
			expect(api.getGroupProps(index)).toMatchObject({
				role: "group",
				"aria-labelledby": api.getGroupLabelProps(index).id,
			});
			expect(api.getGroupLabelProps(index).id).toBeTruthy();
		}
		expect(new Set(api.groups.map((_, index) => api.getGroupLabelProps(index).id)).size).toBe(3);
	});

	it("uses first-seen group order and ids as labels without configuration", () => {
		const controller = create({ char: "@", data: items });
		open(controller);
		expect(view(controller).groups.map((group) => [group.id, group.label])).toEqual([
			["teams", "teams"],
			["people", "people"],
			["channels", "channels"],
		]);
		expect(view(controller).items.map((item) => item.id)).toEqual(["t1", "p1", "p2", "c1"]);
	});

	it("keeps unlisted groups after configured groups", () => {
		const controller = create({ char: "@", data: items, groups: [groups[0]] });
		open(controller);
		expect(view(controller).groups.map((group) => group.id)).toEqual([
			"people",
			"teams",
			"channels",
		]);
	});

	it.each([false, true])("caps the whole grouped list for async=%s", async (asyncMode) => {
		const controller = create({
			char: "@",
			data: asyncMode ? async () => items : items,
			groups,
			maxSuggestions: 2,
			debounce: 0,
		});
		open(controller);
		await vi.advanceTimersByTimeAsync(0);
		expect(view(controller).items.map((item) => item.id)).toEqual(["p1", "p2"]);
		expect(view(controller).groups.map((group) => group.label)).toEqual(["People"]);
	});

	it("navigates across groups without heading indices and selects the actual item", () => {
		const controller = create({ char: "@", data: items, groups });
		open(controller);
		for (const index of [0, 1, 2, 3, 0]) {
			controller.handleKeyDown("ArrowDown");
			expect(view(controller).highlightedIndex).toBe(index);
			expect(view(controller).inputProps["aria-activedescendant"]).toBe(
				view(controller).getItemProps(index).id,
			);
		}
		controller.handleKeyDown("ArrowUp");
		expect(view(controller).highlightedIndex).toBe(3);
		controller.handleKeyDown("Home");
		expect(view(controller).highlightedIndex).toBe(0);
		controller.handleKeyDown("End");
		expect(view(controller).highlightedIndex).toBe(3);
		expect(controller.handleKeyDown("Enter")).toEqual({
			handled: true,
			action: "select",
			item: channel,
		});
	});

	it("keeps mixed ungrouped items heading-free and entirely ungrouped lists unchanged", () => {
		const plain = [
			{ id: "u1", label: "One" },
			{ id: "u2", label: "Two" },
		];
		const mixed = create({ char: "@", data: [team, plain[0], people[0], plain[1]], groups });
		open(mixed);
		expect(view(mixed).items.map((item) => item.id)).toEqual(["u1", "u2", "p1", "t1"]);
		expect(view(mixed).groups[0]).toMatchObject({
			id: null,
			label: null,
			startIndex: 0,
			items: plain,
		});
		const controller = create({ char: "@", data: plain, groups });
		open(controller);
		expect(view(controller).groups).toEqual([]);
		expect(view(controller).items).toEqual(plain);
		controller.handleKeyDown("End");
		controller.handleKeyDown("ArrowDown");
		expect(view(controller).highlightedIndex).toBe(0);
		expect(view(controller).getItemProps(0).id).toBe("mention-item-groups-acceptance-0");
	});
});
