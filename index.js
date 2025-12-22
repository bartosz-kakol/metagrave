import {app} from "electron";
import * as platform from "./platform_detect.js";
import {getChatWindow, getTray} from "./app/state.js";
import {createSplashWindow} from "./app/windows/splash.js";
import {createLoginWindow} from "./app/windows/login.js";
import Updater from "./updater/updater.js";

const updater = new Updater({
	channel: "stable"
});

async function checkForUpdates() {
	await updater.checkForUpdates();
}

app.whenReady().then(() => {
	const splashWindow = createSplashWindow();

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