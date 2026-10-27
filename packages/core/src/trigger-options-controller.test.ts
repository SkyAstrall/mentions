import { describe, expect, it } from "vitest";
import { connect } from "./connect.ts";
import { MentionController } from "./controller.ts";
import type { TriggerConfig } from "./types.ts";

describe("controller trigger opening options", () => {
	it("opens and closes according to each trigger configuration", () => {
		const triggers: TriggerConfig[] = [
			{ char: "/", data: [{ id: "run", label: "Run" }], startOfLine: true },
			{ char: "@", data: [{ id: "alice", label: "Alice" }], allowedPrefixes: ["("] },
		];
		const controller = new MentionController({ triggers });
		const cases: Array<[string, boolean, string | null]> = [
			["/r", true, "/"],
			["intro /r", false, null],
			["intro\n/r", true, "/"],
			["(@a", true, "@"],
			[" @a", false, null],
		];
		try {
			for (const [text, open, activeTrigger] of cases) {
				controller.handleInputChange(text, text, text.length);
				const view = connect(controller.getState(), "opening-options");
				expect(view.isOpen).toBe(open);
				expect(view.inputProps["aria-expanded"]).toBe(open);
				expect(view.activeTrigger).toBe(activeTrigger);
				if (open) expect(view.items).toHaveLength(1);
			}
		} finally {
			controller.destroy();
		}
	});

	it("uses updated restrictions on subsequent input", () => {
		const trigger: TriggerConfig = { char: "@", data: [{ id: "alice", label: "Alice" }] };
		const controller = new MentionController({ triggers: [trigger] });
		try {
			controller.handleInputChange(" @a", " @a", 3);
			expect(connect(controller.getState(), "updated-options").isOpen).toBe(true);
			controller.setOptions({ triggers: [{ ...trigger, allowedPrefixes: [] }] });
			controller.handleInputChange(" @a", " @a", 3);
			expect(connect(controller.getState(), "updated-options").isOpen).toBe(false);
			controller.setOptions({ triggers: [trigger] });
			controller.handleInputChange(" @a", " @a", 3);
			expect(connect(controller.getState(), "updated-options").isOpen).toBe(true);
		} finally {
			controller.destroy();
		}
	});
});
