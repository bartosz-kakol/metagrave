import Store from "electron-store";
import * as platform from "../platform_detect.js";

// Shared mutable state for main process entities

/** @type {?ElectronBrowserWindow} */
let chatWindow = null;
/** @type {?ElectronBrowserWindow} */
let settingsWindow = null;
/** @type {?ElectronTray} */
let tray = null;

const settingsStore = new Store({
	name: "settings",
	defaults: {
		appearance: {
			useSystemWindowFrame: platform.isOther,
			useNativeEmojis: false,
		}
	}
});

const props = {
	chatWindow: [
		() => chatWindow,
		v => chatWindow = v
	],
	settingsWindow: [
		() => settingsWindow,
		v => settingsWindow = v
	],
	tray: [
		() => tray,
		v => tray = v
	],
	settingsStore: [
		() => settingsStore,
		null
	],
};

/**
 * @typedef {Object} State
 * @property {import("electron").BrowserWindow} chatWindow
 * @property {import("electron").BrowserWindow} settingsWindow
 * @property {import("electron").Tray} tray
 * @property {Store} settingsStore
 */

/** @type {State} */
const mod = new Proxy({}, {
	get: (target, prop) => {
		const propObj = props[prop];
		if (!propObj) {
			throw new Error(`"${prop}" is not a valid state.`);
		}

		const getter = propObj[0];
		if (typeof getter !== "function") {
			throw new Error(`"${prop}" does not have a getter.`);
		}

		return getter();
	},
	set: (target, prop, value) => {
		const propObj = props[prop];
		if (!propObj) {
			throw new Error(`"${prop}" is not a valid state.`);
		}

		const setter = propObj[1];
		if (typeof setter !== "function") {
			throw new Error(`"${prop}" does not have a setter.`);
		}

		setter(value);

		return true;
	}
});

export default mod;
