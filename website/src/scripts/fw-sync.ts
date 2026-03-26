const STORAGE_KEY = "fw-preference";

export type Framework = "react" | "vue" | "svelte";

export function getFramework(): Framework {
	const saved = localStorage.getItem(STORAGE_KEY);
	if (saved === "vue") return "vue";
	if (saved === "svelte") return "svelte";
	return "react";
}

export function setFramework(fw: Framework): void {
	localStorage.setItem(STORAGE_KEY, fw);
}

export function dispatchFwChange(fw: string): void {
	window.dispatchEvent(new CustomEvent("fw-change", { detail: fw }));
}

export function onFwChange(callback: (fw: string) => void): void {
	window.addEventListener("fw-change", ((e: CustomEvent) => {
		callback(e.detail);
	}) as EventListener);
}

export function updateSlidingIndicator(
	container: HTMLElement,
	activeEl: HTMLElement,
	indicator: HTMLElement,
	padding = 3,
): void {
	const containerRect = container.getBoundingClientRect();
	const tabRect = activeEl.getBoundingClientRect();
	indicator.style.width = `${tabRect.width}px`;
	indicator.style.transform = `translateX(${tabRect.left - containerRect.left - padding}px)`;
}
