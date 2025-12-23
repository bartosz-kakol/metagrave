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

	//region profile_detect
	console.log("[init/profile_detect] Waiting for root element...");
	await detector.waitForRootElement();

	console.log("[init/profile_detect] Waiting for avatar image...");
	const avatarURL = await detector.detect(() => {
		const profileMenuButton = document.querySelector(elements.profileButton);

		if (!profileMenuButton) return null;

		const foundImages = profileMenuButton.getElementsByTagName("image");

		if (foundImages.length === 0) return null;

		/* Open the profile menu temporarily */
		profileMenuButton.click();

		return foundImages[0].getAttribute("xlink:href");
	});
	console.log(`[init/profile_detect] avatarURL = ${avatarURL}`);

	console.log("[init/profile_detect] Waiting for profile name label...");
	const profileName = await detector.detect(() => {
		const profileNameLabel = document.querySelector(elements.profileNameLabel);

		if (!profileNameLabel) return null;

		/* Close the profile menu */
		document.querySelector(elements.profileButton).click();

		/* Add the tag which makes the profile menu visible normally after our shenanigangs */
		document.body.setAttribute("data-metagrave-show-profile-menu", "1");

		return profileNameLabel.textContent.trim();
	});
	console.log(`[init/profile_detect] profileName = ${profileName}`);
	//endregion

	setProfile(avatarURL, profileName);
}

ipcRenderer.on("chat:open-profile-menu", () => {
	document.querySelector(elements.profileButton).click();
});

ipcRenderer.on("chat:chat-url-changed", () => {
	const url = location.href;

	const closeMediaButton = document.querySelector(".metagrave-close-media-button");
	closeMediaButton.style.display = url.startsWith("https://www.facebook.com/messenger_media") ? null : "none";
});

document.addEventListener("DOMContentLoaded", () => {
	// Add a replacement button for closing media content in specific circumstances
	const closeMediaButton = document.createElement("button");
	closeMediaButton.classList.add("metagrave-close-media-button");
	closeMediaButton.style.display = "none";
	closeMediaButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-x"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
	closeMediaButton.addEventListener("click", () => {
		history.back();
	});
	document.body.appendChild(closeMediaButton);

	ipcRenderer.invoke("chat:get-elements")
		.then(elements_ => {
			elements = structuredClone(elements_);
			init();
		});
});
