import { app, BrowserWindow, ipcMain, dialog, shell } from "electron";
import state from "../state.js";
import { simpleLogger } from "../../utils.js";

const log = simpleLogger("windows/settings");

export function createSettingsWindow() {
	let settingsWindow = state.settingsWindow;

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
		parent: state.chatWindow,
		maximizable: false,
		title: "Settings",
		autoHideMenuBar: true,
		resizable: true,
		backgroundColor: "#242728",
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
		},
	});

	settingsWindow.webContents.setWindowOpenHandler(({ url }) => {
		if (url.startsWith("http:") || url.startsWith("https:")) {
			shell.openExternal(url);

			return { action: "deny" };
		}

		return { action: "allow" };
	});

	settingsWindow.loadFile("embed/settings.html");

	state.settingsWindow = settingsWindow;

	settingsWindow.on("closed", () => {
		state.settingsWindow = null;
	});

	return settingsWindow;
}

ipcMain.on("settings:set", (event, key, value) => {
	log(`Setting changed: ${key} = ${value}`);

	state.settingsStore.set(key, value);
});

ipcMain.handle("settings:get", (event, key) => {
	return state.settingsStore.get(key);
});

ipcMain.on("settings:reset", () => {
	state.settingsStore.clear();
	app.relaunch();
	app.exit();
});

ipcMain.on("settings:edit-file", () => {
	const settingsWindow = state.settingsWindow;

	if (!settingsWindow) return;

	state.settingsStore.openInEditor()
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
