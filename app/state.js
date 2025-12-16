// Shared mutable state for main process entities

let chatWindow = null;
let tray = null;

function setChatWindow(win) {
	chatWindow = win || null;
}

function getChatWindow() {
	return chatWindow || null;
}

function setTray(t) {
	tray = t || null;
}

function getTray() {
	return tray || null;
}

module.exports = {
	setChatWindow,
	getChatWindow,
	setTray,
	getTray,
};
