const {ipcRenderer} = require("electron");

class ElementDetector {
	/** @type {string} */
	#rootElementSelector;

	/** @type {?HTMLElement} */
	#rootElement = null;

	/** @type {?MutationObserver} */
	#observer = null;

	constructor(selector) {
		this.#rootElementSelector = selector;
	}

	/**
	 * @returns {Promise<void>}
	 */
	waitForRootElement() {
		return new Promise(resolve => {
			const bodyObserver = new MutationObserver((_, observer) => {
				this.#rootElement = document.querySelector(this.#rootElementSelector);

				if (this.#rootElement) {
					observer.disconnect();
					resolve();
				}
			});

			bodyObserver.observe(document.body, { childList: true, subtree: true });
		});
	}

	/**
	 * @template T
	 * @param finder {() => ?T}
	 * @returns {Promise<T>}
	 */
	detect(finder) {
		this.#observer?.disconnect();
		this.#observer = null;

		return new Promise(resolve => {
			const foundImmediate = finder();

			if (foundImmediate) {
				resolve(foundImmediate);
				return;
			}

			this.#observer = new MutationObserver((_, observer) => {
				const found = finder();

				if (!found) return;

				observer.disconnect();
				this.#observer = null;
				resolve(found);
			});

			this.#observer.observe(this.#rootElement, { childList: true, subtree: true });
		});
	}
}

/** @type {typeof import("../misc.json").chatElements} */
let elements = {};

function setProfile(avatarURL, name) {
	ipcRenderer.send("chat:set-profile", avatarURL, name);
}

async function init() {
	const detector = new ElementDetector(elements.facebookTopBanner);

	await detector.waitForRootElement();

	const avatarURL = await detector.detect(() => {
		const profileMenuButton = document.querySelector(elements.profileButton);

		if (!profileMenuButton) return null;

		const foundImages = document.body.getElementsByTagName("image");

		if (foundImages.length === 0) return null;

		/* Open the profile menu temporarily */
		profileMenuButton.click();

		return foundImages[0].getAttribute("xlink:href");
	});

	const profileName = await detector.detect(() => {
		const profileNameLabel = document.querySelector(elements.profileNameLabel);

		if (!profileNameLabel) return null;

		/* Close the profile menu */
		document.querySelector(elements.profileButton).click();

		/* Add the tag which makes the profile menu visible normally after our shenanigangs */
		document.body.setAttribute("data-metagrave-show-profile-menu", "1");

		return profileNameLabel.textContent;
	});

	setProfile(avatarURL, profileName);
}

ipcRenderer.on("chat:open-profile-menu", () => {
	document.querySelector(elements.profileButton).click();
});

document.addEventListener("DOMContentLoaded", () => {
	ipcRenderer.invoke("chat:get-elements")
		.then(elements_ => {
			elements = structuredClone(elements_);
			init();
		});
});
