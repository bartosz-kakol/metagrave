const { ipcRenderer } = require("electron");

function setProfile(avatarURL, name) {
	ipcRenderer.send("chat:set-profile", avatarURL, name);
}

/**
 * Watches for an element to appear in the DOM and then watches for changes inside it.
 * @param {string} selector - The CSS selector of the element to watch
 * @param {(type: "appeared"|"changed", element: Element, mutationRecord: ?MutationRecord) => any} onEvent - Callback containing `(type, element, mutationRecord)`.
 */
function watchElement(selector, onEvent) {
	// 1. Check if an element already exists
	const existingElement = document.querySelector(selector);
	if (existingElement) {
		onEvent("appeared", existingElement, null);
		startObservingChanges(existingElement);
		return; // Don't need to wait for an appearance
	}

	// 2. If not found, watch the document body for its addition
	const bodyObserver = new MutationObserver((mutations, observer) => {
		const target = document.body.querySelector(selector);

		if (!target) return;

		// Stop watching the body (performance optimization)
		observer.disconnect();

		onEvent("appeared", target, null);
		startObservingChanges(target);
	});

	// Start watching the body for added nodes
	bodyObserver.observe(document.body, { childList: true, subtree: true });

	// --- Internal Helper to watch the specific element ---
	function startObservingChanges(element) {
		const elementObserver = new MutationObserver((mutations) => {
			mutations.forEach(mutation => {
				onEvent("changed", element, mutation);
			});
		});

		elementObserver.observe(element, {
			attributes: true,      // Watch for attribute changes (class, style, href, etc.)
			childList: true,       // Watch for added/removed children
			subtree: true,         // Watch all descendants (deep watch)
			characterData: true    // Watch for text content changes
		});
	}
}

document.addEventListener("DOMContentLoaded", () => {
	watchElement(
		`html > body > div:first-of-type > div > div:first-of-type > div > div:nth-of-type(2) > div:nth-of-type(5) > div:first-of-type > span > div > div:first-of-type > div`,
		(type, element, mutation) => {
			const foundImages = element.getElementsByTagName("image");

			if (foundImages.length === 0) return;

			const avatarURL = foundImages[0].getAttribute("xlink:href");

			setProfile(avatarURL, "test");
		}
	);
});
