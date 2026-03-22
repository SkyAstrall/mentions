const FEEDBACK_DURATION = 2000;

export function copyToClipboard(text: string): Promise<void> {
	return navigator.clipboard.writeText(text).catch(() => {
		const ta = document.createElement("textarea");
		ta.value = text;
		ta.style.position = "fixed";
		ta.style.opacity = "0";
		document.body.appendChild(ta);
		ta.select();
		document.execCommand("copy");
		document.body.removeChild(ta);
	});
}

export function initCopyButtons(selector: string): void {
	document.querySelectorAll<HTMLButtonElement>(selector).forEach((btn) => {
		if (btn.dataset.copyInit) return;
		btn.dataset.copyInit = "1";
		btn.addEventListener("click", () => {
			const text = btn.dataset.copy ?? btn.dataset.code ?? "";
			copyToClipboard(text);
			btn.classList.add("copied");
			const prevLabel = btn.getAttribute("aria-label");
			btn.setAttribute("aria-label", "Copied!");
			setTimeout(() => {
				btn.classList.remove("copied");
				if (prevLabel) btn.setAttribute("aria-label", prevLabel);
			}, FEEDBACK_DURATION);
		});
	});
}
