import { computed, type DestroyRef, type Signal, signal } from "@angular/core";
import {
	connect,
	type ListScrollGeometry,
	MentionController,
	type MentionControllerOptions,
	type MentionState,
} from "@skyastrall/mentions-core";

export class MentionsControllerBridge {
	readonly controller: MentionController;
	readonly state: Signal<MentionState>;
	readonly groups = computed(() => this.state().groups ?? []);
	readonly hasMore = computed(() => this.state().hasMore ?? false);
	readonly isLoadingMore = computed(() => this.state().isLoadingMore ?? false);
	connect(id: string) {
		return connect(this.state(), id);
	}
	loadMore(): void {
		this.controller.loadMore();
	}
	handleListScroll(geometry: ListScrollGeometry): void {
		this.controller.handleListScroll(geometry);
	}

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
