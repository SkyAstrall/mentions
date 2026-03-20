import { describe, expect, it } from "vitest";
import { filterItems } from "./filter.ts";

describe("filterItems", () => {
	const items = [
		{ id: "1", label: "Alice" },
		{ id: "2", label: "Bob" },
		{ id: "3", label: "Charlie" },
		{ id: "4", label: "alice bob" },
	];

	it("returns all items for empty query", () => {
		expect(filterItems(items, "")).toEqual(items);
	});

	it("filters by prefix match (case-insensitive)", () => {
		const result = filterItems(items, "al");
		expect(result).toHaveLength(2);
		expect(result[0].label).toBe("Alice");
		expect(result[1].label).toBe("alice bob");
	});

	it("filters by substring match", () => {
		const result = filterItems(items, "ob");
		expect(result).toHaveLength(2);
		expect(result[0].label).toBe("Bob");
		expect(result[1].label).toBe("alice bob");
	});

	it("returns empty array when nothing matches", () => {
		const result = filterItems(items, "xyz");
		expect(result).toEqual([]);
	});

	it("is case insensitive", () => {
		const result = filterItems(items, "BOB");
		expect(result).toHaveLength(2);
	});
});
