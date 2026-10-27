import type { TriggerConfig } from "@skyastrall/mentions-core";

type PlaygroundTrigger = Pick<TriggerConfig, "char" | "data" | "color"> & {
	enabled: boolean;
	label: string;
};

type PlaygroundOptions = {
	asyncMode: boolean;
	asyncUsers: TriggerConfig["data"];
	debounce: number;
	minChars: number;
	maxSuggestions: number;
};

function openingOptions(char: string): Pick<TriggerConfig, "startOfLine" | "allowedPrefixes"> {
	if (char === "/") return { startOfLine: true };
	if (char === "#") return { allowedPrefixes: [" ", "("] };
	return {};
}

export function buildPlaygroundTriggers(
	states: PlaygroundTrigger[],
	options: PlaygroundOptions,
): TriggerConfig[] {
	return states
		.filter((trigger) => trigger.enabled)
		.map((trigger) => ({
			char: trigger.char,
			data: options.asyncMode && trigger.char === "@" ? options.asyncUsers : trigger.data,
			color: trigger.color,
			debounce: options.debounce,
			minChars: options.minChars,
			...(options.maxSuggestions > 0 ? { maxSuggestions: options.maxSuggestions } : {}),
			...openingOptions(trigger.char),
		}));
}

export function formatPlaygroundTrigger(trigger: PlaygroundTrigger, asyncMode: boolean): string {
	const data = asyncMode && trigger.char === "@" ? "fetchUsers" : trigger.label.toLowerCase();
	const options = Object.entries(openingOptions(trigger.char))
		.map(([key, value]) => `, ${key}: ${JSON.stringify(value)}`)
		.join("");
	return `    { char: "${trigger.char}", data: ${data}, color: "${trigger.color}"${options} }`;
}

export function generateAngularCode(
	states: PlaygroundTrigger[],
	options: { asyncMode: boolean; placeholder: string; singleLine: boolean },
): string {
	const triggers = states.map((trigger) => formatPlaygroundTrigger(trigger, options.asyncMode));
	const inputs = [`[triggers]="triggers"`, `[(ngModel)]="markup"`];
	if (options.placeholder) inputs.push(`placeholder="${options.placeholder}"`);
	if (options.singleLine) inputs.push(`[singleLine]="true"`);
	return [
		`import { Component } from "@angular/core"`,
		`import { FormsModule } from "@angular/forms"`,
		`import { SaMentions } from "@skyastrall/mentions-angular"`,
		``,
		`@Component({`,
		`  standalone: true,`,
		`  imports: [SaMentions, FormsModule],`,
		`  template: \``,
		`    <sa-mentions`,
		...inputs.map((input) => `      ${input}`),
		`    />\`,`,
		`})`,
		`export class CommentBox {`,
		`  triggers = [`,
		triggers.join(",\n"),
		`  ]`,
		`  markup = ""`,
		`}`,
	].join("\n");
}
