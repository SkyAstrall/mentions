import {
	ChangeDetectionStrategy,
	Component,
	computed,
	signal,
	ViewEncapsulation,
	viewChild,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import {
	extractMentions,
	markupToPlainText,
	type MentionItem,
	SaMentions,
	type TriggerConfig,
} from "@skyastrall/mentions-angular";
import { commands, tags, users } from "../../data/mock";

type TriggerState = {
	enabled: boolean;
	char: string;
	label: string;
	color: string;
	data: MentionItem[];
};

const COLOR_OPTIONS = [
	"rgba(99,102,241,0.25)",
	"rgba(59,130,246,0.25)",
	"rgba(16,185,129,0.25)",
	"rgba(245,158,11,0.25)",
	"rgba(244,63,94,0.25)",
	"rgba(139,47,201,0.25)",
	"rgba(236,72,153,0.25)",
	"rgba(20,184,166,0.25)",
];

let customSeq = 0;

@Component({
	selector: "angular-playground",
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	// None + an #playground-angular prefix on every selector mirrors how the
	// Svelte/Vue/React playgrounds reach the editor's internals: scoped to the
	// island by id, never leaking into the other framework tabs on the page.
	encapsulation: ViewEncapsulation.None,
	imports: [SaMentions, FormsModule],
	template: `
		<div class="pg">
			<div class="pg-main">
				<div class="pg-preview">
					<sa-mentions
						class="pg-editor"
						[triggers]="triggers()"
						[ngModel]="markup()"
						(ngModelChange)="onMarkupChange($event)"
						[singleLine]="singleLine()"
						[disabled]="isDisabled()"
						[readOnly]="isReadOnly()"
						[placeholder]="placeholder()"
						(mentionInsert)="log('select ' + $event.trigger + $event.item.label)"
						(mentionRemove)="log('remove ' + $event.trigger + $event.item.label)"
						(opened)="log('open ' + $event)"
						(closed)="log('close')"
					/>
				</div>

				<div class="pg-code">
					<div class="pg-code-header">
						<span>Generated Code</span>
						<button type="button" class="pg-btn-sm" (click)="copy()">
							{{ copied() ? "Copied!" : "Copy" }}
						</button>
					</div>
					<pre><code>{{ code() }}</code></pre>
				</div>

				@if (markup() || plainText()) {
					<div class="pg-panel">
						<div class="pg-panel-header">Output</div>
						<div class="pg-panel-body">
							<div><span class="pg-label">Markup</span> <code>{{ markup() }}</code></div>
							<div><span class="pg-label">Plain text</span> <code>{{ plainText() }}</code></div>
							<div><span class="pg-label">Mentions</span> <code>{{ mentionsJson() }}</code></div>
						</div>
					</div>
				}

				@if (events().length) {
					<div class="pg-panel">
						<div class="pg-panel-header">
							<span>Event Log ({{ events().length }})</span>
							<button type="button" class="pg-btn-sm" (click)="events.set([])">Clear</button>
						</div>
						<div class="pg-events-list">
							@for (e of events(); track $index) {
								<div class="pg-event">{{ e }}</div>
							}
						</div>
					</div>
				}
			</div>

			<div class="pg-sidebar">
				<div class="pg-section">
					<h3>Triggers</h3>
					@for (t of triggerStates(); track $index) {
						<div class="pg-trigger-row">
							<label class="pg-toggle">
								<input
									type="checkbox"
									[checked]="t.enabled"
									(change)="setTrigger($index, { enabled: $any($event.target).checked })"
								/>
								<span class="pg-trigger-char">{{ t.char }}</span>
								<span>{{ t.label }}</span>
							</label>
							<div class="pg-color-row">
								@for (c of colorOptions; track c) {
									<button
										type="button"
										class="pg-color-dot"
										[class.active]="t.color === c"
										[style.background]="solid(c)"
										(click)="setTrigger($index, { color: c })"
									></button>
								}
								@if (triggerStates().length > 1) {
									<button type="button" class="pg-btn-sm pg-btn-danger" (click)="removeTrigger($index)">
										Remove
									</button>
								}
							</div>
						</div>
					}
					<div class="pg-add-trigger-form">
						<div class="pg-add-trigger-row">
							<input
								type="text"
								class="pg-input-sm pg-input-char"
								maxlength="2"
								placeholder="!"
								[(ngModel)]="customChar"
							/>
							<input
								type="text"
								class="pg-input-sm pg-input-grow"
								placeholder="Label (e.g. Emojis)"
								[(ngModel)]="customLabel"
							/>
						</div>
						<input
							type="text"
							class="pg-input"
							placeholder="Items (comma separated: smile, wave, fire)"
							[(ngModel)]="customItems"
						/>
						<div class="pg-add-trigger-row">
							<div class="pg-color-row pg-color-row-flush">
								@for (c of colorOptions; track c) {
									<button
										type="button"
										class="pg-color-dot"
										[class.active]="customColor() === c"
										[style.background]="solid(c)"
										(click)="customColor.set(c)"
									></button>
								}
							</div>
							<button type="button" class="pg-btn-sm pg-btn-nowrap" (click)="addCustomTrigger()">
								Add trigger
							</button>
						</div>
					</div>
				</div>

				<div class="pg-section">
					<h3>Editor</h3>
					<label class="pg-toggle">
						<input
							type="checkbox"
							[ngModel]="singleLine()"
							(ngModelChange)="singleLine.set($event)"
						/><span>Single line</span>
					</label>
					<label class="pg-toggle">
						<input
							type="checkbox"
							[ngModel]="isDisabled()"
							(ngModelChange)="isDisabled.set($event)"
						/><span>Disabled</span>
					</label>
					<label class="pg-toggle">
						<input
							type="checkbox"
							[ngModel]="isReadOnly()"
							(ngModelChange)="isReadOnly.set($event)"
						/><span>Read only</span>
					</label>
					<label class="pg-toggle">
						<input
							type="checkbox"
							[ngModel]="asyncMode()"
							(ngModelChange)="asyncMode.set($event)"
						/><span>Async &#64; data</span>
					</label>
					<div class="pg-field">
						<label>Placeholder</label>
						<input
							type="text"
							class="pg-input"
							[ngModel]="placeholder()"
							(ngModelChange)="placeholder.set($event)"
						/>
					</div>
				</div>

				<div class="pg-section">
					<h3>Trigger Options</h3>
					<div class="pg-field">
						<label>Debounce (ms)</label>
						<input
							type="number"
							class="pg-input"
							min="0"
							step="50"
							[ngModel]="debounceMs()"
							(ngModelChange)="debounceMs.set(+$event)"
						/>
					</div>
					<div class="pg-field">
						<label>Min chars</label>
						<input
							type="number"
							class="pg-input"
							min="0"
							[ngModel]="minChars()"
							(ngModelChange)="minChars.set(+$event)"
						/>
					</div>
					<div class="pg-field">
						<label>Max suggestions (0 = all)</label>
						<input
							type="number"
							class="pg-input"
							min="0"
							[ngModel]="maxSuggestions()"
							(ngModelChange)="maxSuggestions.set(+$event)"
						/>
					</div>
				</div>

				<div class="pg-section">
					<h3>Actions</h3>
					<div class="pg-actions">
						<button type="button" (click)="mentionsRef().focus()">Focus</button>
						<button type="button" (click)="clear()">Clear</button>
						@for (t of enabledTriggers(); track t.char) {
							<button
								type="button"
								(mousedown)="$event.preventDefault(); mentionsRef().insertTrigger(t.char)"
							>
								Insert {{ t.char }}
							</button>
						}
					</div>
				</div>

				<div class="pg-section">
					<h3>Stress Tests</h3>
					<div class="pg-actions">
						<button type="button" (click)="stressClearInsert()">Clear + Insert</button>
						<button type="button" (click)="stressRapid5x()">Rapid 5x &#64;</button>
						<button type="button" (click)="stressRapid10xMixed()">Rapid 10x mixed</button>
					</div>
				</div>
			</div>
		</div>
	`,
	styles: [
		`
			#playground-angular .pg { display: flex; gap: 24px; width: 100%; }
			#playground-angular .pg-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 12px; }
			#playground-angular .pg-sidebar { width: 280px; flex-shrink: 0; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; max-height: calc(100vh - 180px); position: sticky; top: 100px; }
			#playground-angular .pg-preview { border-radius: 12px; }
			#playground-angular sa-mentions { display: block; }
			#playground-angular [data-mentions-editor] { width: 100%; min-height: 140px; padding: 16px; border: 1px solid var(--color-border); border-radius: 12px; font-family: 'Inter', system-ui, sans-serif; font-size: 15px; line-height: 1.6; box-sizing: border-box; color: var(--color-text); background: var(--color-bg-elevated); }
			#playground-angular [data-mentions-editor]:focus { border-color: #DD0031; box-shadow: 0 0 0 3px rgba(221,0,49,0.15); outline: none; }
			#playground-angular [data-mentions] { --dropdown-bg: var(--color-bg-elevated); --dropdown-border: 1px solid var(--color-border); --dropdown-shadow: 0 8px 24px rgba(0,0,0,0.15); --item-active-bg: var(--color-accent-muted); --mention-placeholder: var(--color-text-dim); }
			#playground-angular .sa-mentions-list { color: var(--color-text); background: var(--color-bg-elevated); border: 1px solid var(--color-border); box-shadow: 0 8px 24px rgba(0,0,0,0.15); }
			#playground-angular .sa-mentions-item { font-size: 14px; border-radius: 6px; margin: 2px 4px; }
			#playground-angular .sa-mentions-item--active { background: var(--color-accent-muted); }
			#playground-angular .pg-code { background: var(--color-code-bg); border: 1px solid var(--color-code-border); border-radius: 12px; overflow: hidden; }
			#playground-angular .pg-code-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-bottom: 1px solid var(--color-border); font-size: 12px; color: var(--color-text-muted); }
			#playground-angular .pg-code pre { margin: 0; padding: 14px; overflow-x: auto; }
			#playground-angular .pg-code code { font-family: var(--font-mono); font-size: 13px; line-height: 1.6; color: var(--color-code-text); white-space: pre; }
			#playground-angular .pg-panel { background: var(--color-bg-elevated); border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden; }
			#playground-angular .pg-panel-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-bottom: 1px solid var(--color-border); font-size: 12px; font-weight: 500; color: var(--color-text-muted); }
			#playground-angular .pg-panel-body { padding: 10px 12px; font-size: 12px; color: var(--color-text-muted); display: flex; flex-direction: column; gap: 6px; }
			#playground-angular .pg-panel-body code { font-family: var(--font-mono); font-size: 11px; word-break: break-all; color: var(--color-text-secondary); }
			#playground-angular .pg-label { font-weight: 500; color: var(--color-text-dim); margin-right: 6px; }
			#playground-angular .pg-events-list { max-height: 120px; overflow-y: auto; }
			#playground-angular .pg-event { padding: 3px 12px; font-family: var(--font-mono); font-size: 11px; color: var(--color-text-dim); border-bottom: 1px solid var(--color-border); }
			#playground-angular .pg-event:first-child { color: var(--color-text-secondary); }
			#playground-angular .pg-section { padding-bottom: 16px; border-bottom: 1px solid var(--color-border); }
			#playground-angular .pg-section:last-child { border-bottom: none; }
			#playground-angular .pg-section h3 { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-muted); margin: 0 0 10px; }
			#playground-angular .pg-toggle { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--color-text-secondary); cursor: pointer; padding: 3px 0; }
			#playground-angular .pg-toggle input { accent-color: #DD0031; }
			#playground-angular .pg-toggle span { user-select: none; }
			#playground-angular .pg-trigger-char { font-family: var(--font-mono); font-weight: 600; color: var(--color-text); min-width: 16px; }
			#playground-angular .pg-trigger-row { margin-bottom: 8px; }
			#playground-angular .pg-color-row { display: flex; align-items: center; gap: 4px; margin-top: 4px; padding-left: 24px; }
			#playground-angular .pg-color-row-flush { padding-left: 0; }
			#playground-angular .pg-color-dot { width: 20px; height: 20px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transition: transform 150ms ease, box-shadow 150ms ease; outline: 2px solid transparent; outline-offset: 2px; padding: 0; }
			#playground-angular .pg-color-dot.active { outline-color: var(--color-accent); transform: scale(1.15); }
			#playground-angular .pg-color-dot:hover:not(.active) { transform: scale(1.1); box-shadow: 0 0 0 2px var(--color-border-hover); }
			#playground-angular .pg-add-trigger-form { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--color-border); display: flex; flex-direction: column; gap: 8px; }
			#playground-angular .pg-add-trigger-row { display: flex; gap: 6px; align-items: center; }
			#playground-angular .pg-input-sm { padding: 4px 8px; font-size: 12px; border: 1px solid var(--color-border); border-radius: 6px; background: var(--color-bg-surface); color: var(--color-text); font-family: var(--font-mono); }
			#playground-angular .pg-input-sm:focus { border-color: #DD0031; outline: none; }
			#playground-angular .pg-input-char { width: 36px; text-align: center; }
			#playground-angular .pg-input-grow { flex: 1; }
			#playground-angular .pg-field { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; }
			#playground-angular .pg-field label { font-size: 12px; color: var(--color-text-dim); }
			#playground-angular .pg-input { padding: 6px 10px; font-size: 13px; border: 1px solid var(--color-border); border-radius: 6px; background: var(--color-bg-surface); color: var(--color-text); }
			#playground-angular .pg-input:focus { border-color: #DD0031; outline: none; }
			#playground-angular .pg-actions { display: flex; flex-wrap: wrap; gap: 6px; }
			#playground-angular .pg-actions button { padding: 6px 12px; border: 1px solid var(--color-border); border-radius: 6px; background: none; color: var(--color-text-muted); font-size: 12px; cursor: pointer; transition: color 150ms ease, border-color 150ms ease; }
			#playground-angular .pg-actions button:hover { color: var(--color-text); border-color: var(--color-border-hover); }
			#playground-angular .pg-btn-sm { background: none; border: 1px solid var(--color-border); color: var(--color-text-muted); font-size: 11px; padding: 3px 8px; border-radius: 4px; cursor: pointer; transition: color 150ms ease; }
			#playground-angular .pg-btn-sm:hover { color: var(--color-text); }
			#playground-angular .pg-btn-nowrap { white-space: nowrap; }
			#playground-angular .pg-btn-danger { color: #ef4444; border-color: rgba(239,68,68,0.2); }
			#playground-angular .pg-btn-danger:hover { color: #f87171; border-color: rgba(239,68,68,0.4); }
			@media (max-width: 768px) {
				#playground-angular .pg { flex-direction: column-reverse; }
				#playground-angular .pg-sidebar { width: 100%; max-height: none; position: static; flex-direction: row; flex-wrap: wrap; }
				#playground-angular .pg-section { flex: 1; min-width: 200px; }
			}
		`,
	],
})
export class AngularPlayground {
	protected readonly mentionsRef = viewChild.required(SaMentions);
	protected readonly colorOptions = COLOR_OPTIONS;

	protected readonly triggerStates = signal<TriggerState[]>([
		{ enabled: true, char: "@", label: "Users", color: COLOR_OPTIONS[0], data: users },
		{ enabled: true, char: "#", label: "Tags", color: COLOR_OPTIONS[2], data: tags },
		{ enabled: true, char: "/", label: "Commands", color: COLOR_OPTIONS[3], data: commands },
	]);

	protected customChar = "!";
	protected customLabel = "Emojis";
	protected customItems = "smile, wave, fire, check";

	protected readonly singleLine = signal(false);
	protected readonly isDisabled = signal(false);
	protected readonly isReadOnly = signal(false);
	protected readonly asyncMode = signal(false);
	protected readonly placeholder = signal("Type @ # or / to try it out...");
	protected readonly debounceMs = signal(200);
	protected readonly minChars = signal(0);
	protected readonly maxSuggestions = signal(0);
	protected readonly customColor = signal(COLOR_OPTIONS[4]);

	protected readonly markup = signal("");
	protected readonly events = signal<string[]>([]);
	protected readonly copied = signal(false);

	protected readonly plainText = computed(() => markupToPlainText(this.markup(), this.triggers()));

	protected readonly enabledTriggers = computed(() => this.triggerStates().filter((t) => t.enabled));

	protected readonly triggers = computed<TriggerConfig[]>(() =>
		this.enabledTriggers().map((t) => ({
			char: t.char,
			data: this.asyncMode() && t.char === "@" ? this.asyncUsers : t.data,
			color: t.color,
			debounce: this.debounceMs(),
			minChars: this.minChars(),
			...(this.maxSuggestions() > 0 ? { maxSuggestions: this.maxSuggestions() } : {}),
		})),
	);

	protected readonly mentionsJson = computed(() => {
		const inert = this.triggers().map((t) => ({ ...t, data: [] as MentionItem[] }));
		const items = extractMentions(this.markup(), inert);
		return items.length ? JSON.stringify(items) : "[]";
	});

	protected readonly code = computed(() => {
		const trigLines = this.enabledTriggers().map((t) => {
			const data = this.asyncMode() && t.char === "@" ? "fetchUsers" : t.label.toLowerCase();
			return `    { char: "${t.char}", data: ${data}, color: "${t.color}" }`;
		});
		const inputs = [`[triggers]="triggers"`, `[(ngModel)]="markup"`];
		if (this.placeholder()) inputs.push(`placeholder="${this.placeholder()}"`);
		if (this.singleLine()) inputs.push(`[singleLine]="true"`);
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
			...inputs.map((i) => `      ${i}`),
			`    />\`,`,
			`})`,
			`export class CommentBox {`,
			`  triggers = [`,
			trigLines.join(",\n"),
			`  ]`,
			`  markup = ""`,
			`}`,
		].join("\n");
	});

	protected solid(color: string): string {
		return color.replace(/[\d.]+\)$/, "1)");
	}

	protected onMarkupChange(value: string): void {
		this.markup.set(value);
	}

	protected setTrigger(index: number, updates: Partial<TriggerState>): void {
		this.triggerStates.update((list) =>
			list.map((t, i) => (i === index ? { ...t, ...updates } : t)),
		);
	}

	protected removeTrigger(index: number): void {
		this.triggerStates.update((list) =>
			list.length <= 1 ? list : list.filter((_, i) => i !== index),
		);
	}

	protected addCustomTrigger(): void {
		const char = this.customChar.trim();
		const label = this.customLabel.trim();
		if (!char || !label) return;
		const data = this.customItems
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean)
			.map((itemLabel) => ({ id: `custom-${++customSeq}`, label: itemLabel }));
		if (!data.length) return;
		this.triggerStates.update((list) => [
			...list,
			{ enabled: true, char, label, color: this.customColor(), data },
		]);
		this.customChar = "!";
		this.customLabel = "";
		this.customItems = "";
	}

	protected clear(): void {
		this.mentionsRef().clear();
		this.markup.set("");
	}

	protected copy(): void {
		try {
			navigator.clipboard?.writeText(this.code());
		} catch {
			// Clipboard API unavailable (insecure context) — nothing to fall back to.
		}
		this.copied.set(true);
		setTimeout(() => this.copied.set(false), 2000);
	}

	protected log(message: string): void {
		this.events.update((list) => [message, ...list].slice(0, 50));
	}

	protected stressClearInsert(): void {
		this.mentionsRef().clear();
		this.mentionsRef().focus();
		setTimeout(() => this.mentionsRef().insertTrigger("@"), 50);
	}

	protected stressRapid5x(): void {
		for (let i = 0; i < 5; i++) {
			setTimeout(() => this.mentionsRef().insertTrigger("@"), i * 80);
		}
	}

	protected stressRapid10xMixed(): void {
		const states = this.triggerStates();
		for (let i = 0; i < 10; i++) {
			const char = states[i % states.length].char;
			setTimeout(() => this.mentionsRef().insertTrigger(char), i * 60);
		}
	}

	private readonly asyncUsers = (query: string): Promise<MentionItem[]> =>
		new Promise((resolve) => {
			const lower = query.toLowerCase();
			setTimeout(() => resolve(users.filter((u) => u.label.toLowerCase().includes(lower))), 350);
		});
}
