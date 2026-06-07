import { type DestroyRef, type Signal, signal } from "@angular/core";
import {
	MentionController,
	type MentionControllerOptions,
	type MentionState,
} from "@skyastrall/mentions-core";

export class MentionsControllerBridge {
	readonly controller: MentionController;
	readonly state: Signal<MentionState>;

	constructor(options: MentionControllerOptions, destroyRef: DestroyRef) {
		this.controller = new MentionController(options);

		const stateSignal = signal(this.controller.getState());
		const unsubscribe = this.controller.subscribe(() => {
			stateSignal.set(this.controller.getState());
		});

		destroyRef.onDestroy(() => {
			unsubscribe();
			this.controller.destroy();
		});

		this.state = stateSignal.asReadonly();
	}
}
