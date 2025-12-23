import Store from "electron-store";

// Shared mutable state for main process entities

/** @type {?ElectronBrowserWindow} */
let chatWindow = null;
/** @type {?ElectronBrowserWindow} */
let settingsWindow = null;
/** @type {?ElectronTray} */
let tray = null;

const store = new Store();

/**
 * @param win {?ElectronBrowserWindow}
 */
export function setChatWindow(win) {
	chatWindow = win || null;
}

/**
 * @returns {?ElectronBrowserWindow}
 */
export function getChatWindow() {
	return chatWindow || null;
}

/**
 * @param win {?ElectronBrowserWindow}
 */
export function setSettingsWindow(win) {
	settingsWindow = win || null;
}

/**
 * @returns {?ElectronBrowserWindow}
 */
export function getSettingsWindow() {
	return settingsWindow || null;
}

/**
 * @param t {?ElectronTray}
 */
export function setTray(t) {
	tray = t || null;
}

/**
 * @returns {?ElectronTray}
 */
export function getTray() {
	return tray || null;
}

/**
 * @returns {Store}
 */
export function getStore() {
	return store;
}
