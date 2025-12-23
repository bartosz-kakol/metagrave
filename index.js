import {app, ipcMain} from "electron";
import * as platform from "./platform_detect.js";
import {getChatWindow, getStore, getTray} from "./app/state.js";
import {createSplashWindow} from "./app/windows/splash.js";
import {createLoginWindow} from "./app/windows/login.js";
import Updater from "./updater/updater.js";
import misc from "./app/misc.json" with {type: "json"};

const updater = new Updater({
	channel: "stable"
});
const store = getStore();

function defaultSettings() {
	store.set("firstRun", true);
	store.set("useSystemWindowFrame", platform.isOther);
}

async function checkForUpdates() {
	await updater.checkForUpdates();
}

app.whenReady().then(() => {
	/*
	Preload scripts can't import arbitrary modules from the main process, but some are vital for the app to stay
	working and easy to modify in the case of a need for critical changes.

	Such modules such be simple enough that they can be passed through IPC and fetched from the renderer
	using `ipcRenderer.invoke`.
	 */
	//region Import handlers
	ipcMain.handle("import:misc", () => misc);
	//endregion

	ipcMain.handle("app:get-version", () => {
		return app.getVersion();
	});

	const splashWindow = createSplashWindow();

	if (!store.get("firstRun")) {
		defaultSettings();
	}

	if (!app.isQuitting) {
		createLoginWindow(() => {
			if (splashWindow && !splashWindow.isDestroyed()) {
				splashWindow.close();
			}

			checkForUpdates()
				.catch(e => {
					console.error(e);
				});
		});
	}

	app.on("activate", () => {
		getChatWindow()?.show();
	});
});

app.on("before-quit", () => {
	app.isQuitting = true;
	getChatWindow()?.destroy();
});

app.on("window-all-closed", () => {
	if (!platform.isMac && !getTray()) {
		app.quit();
	}
});