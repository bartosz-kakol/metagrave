// Shared mutable state for main process entities

/** @type {?ElectronBrowserWindow} */
let chatWindow = null;
/** @type {?ElectronTray} */
let tray = null;

/**
 * @param win {?ElectronBrowserWindow}
 */
function setChatWindow(win) {
	chatWindow = win || null;
}

/**
 * @returns {?ElectronBrowserWindow}
 */
function getChatWindow() {
	return chatWindow || null;
}

/**
 * @param t {?ElectronTray}
 */
function setTray(t) {
	tray = t || null;
}

/**
 * @returns {?ElectronTray}
 */
function getTray() {
	return tray || null;
}

module.exports = {
	setChatWindow, getChatWindow,
	setTray, getTray,
};
