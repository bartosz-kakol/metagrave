import {BrowserWindow, ipcMain} from "electron";
import {getSettingsWindow, setSettingsWindow, getStore} from "../state.js";

export function createSettingsWindow() {
	let settingsWindow = getSettingsWindow();

	if (settingsWindow) {
		settingsWindow.show();

		return settingsWindow;
	}

	settingsWindow = new BrowserWindow({
		width: 800,
		height: 600,
		title: "Settings",
		autoHideMenuBar: true,
		resizable: true,
		backgroundColor: "#1e1e1e",
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

ipcMain.on("settings:open", () => {
	createSettingsWindow();
});

ipcMain.on("settings:changed", (event, key, value) => {
	console.log(`Setting changed: ${key} = ${value}`);

	const store = getStore();

	store.set(key, value);
});
