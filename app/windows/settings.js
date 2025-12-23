import {app, BrowserWindow, ipcMain, dialog} from "electron";
import {getSettingsWindow, setSettingsWindow, getStore, getChatWindow} from "../state.js";
import {simpleLogger} from "../../utils.js";

const log = simpleLogger("windows/settings");

export function createSettingsWindow() {
	let settingsWindow = getSettingsWindow();

	if (settingsWindow) {
		settingsWindow.show();

		return settingsWindow;
	}

	settingsWindow = new BrowserWindow({
		minWidth: 800,
		width: 1000,
		minHeight: 600,
		height: 700,
		center: true,
		modal: true,
		parent: getChatWindow(),
		maximizable: false,
		title: "Settings",
		autoHideMenuBar: true,
		resizable: true,
		backgroundColor: "#2F3233",
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
		},
	});

	settingsWindow.loadFile("embed/settings.html");

	setSettingsWindow(settingsWindow);

	settingsWindow.on("closed", () => {
		setSettingsWindow(null);
	});

	return settingsWindow;
}

ipcMain.on("settings:set", (event, key, value) => {
	log(`Setting changed: ${key} = ${value}`);

	const store = getStore();

	store.set(key, value);
});

ipcMain.handle("settings:get", (event, key) => {
	const store = getStore();

	return store.get(key);
});

ipcMain.on("settings:reset", () => {
	const store = getStore();

	store.clear();
	app.relaunch();
	app.exit();
});

ipcMain.on("settings:edit-file", () => {
	const store = getStore();
	const settingsWindow = getSettingsWindow();

	if (!settingsWindow) return;

	store.openInEditor()
		.catch(e => {
			dialog.showMessageBox(settingsWindow, {
				type: "error",
				textWidth: 250,
				title: "Failed to open settings file",
				message: `Failed to open settings file`,
				detail: e.message,
			});
		});
})

ipcMain.on("settings:open", () => {
	createSettingsWindow();
});
