import { app, ipcMain, protocol, session } from "electron";
import * as platform from "./platform_detect.js";
import state from "./app/state.js";
import { createSplashWindow } from "./app/windows/splash.js";
import { createLoginWindow } from "./app/windows/login.js";
import Updater from "./updater/updater.js";
import misc from "./app/misc.json" with {type: "json"};
import fs from "fs";
import path from "path";
import { p } from "./utils.js";
import { NATIVE_EMOJI_CACHE_DIR } from "./constants.js";

const updater = new Updater({
	channel: "stable"
});

async function checkForUpdates() {
	await updater.checkForUpdates();
}

protocol.registerSchemesAsPrivileged([
	{
		scheme: "mg-native-emoji",
		privileges: {
			standard: true,
			secure: true,
			allowServiceWorkers: true,
			supportFetchAPI: true,
			corsEnabled: true,
		},
	},
]);

app.whenReady().then(() => {
	/*
	Preload scripts can't import arbitrary modules from the main process, but some are vital for the app to stay
	working and easy to modify in the case of a need for critical changes.

	Such modules must be simple enough that they can be passed through IPC and fetched from the renderer
	using `ipcRenderer.invoke`.
	 */
	//region Import handlers
	ipcMain.handle("import:worker", (event, name) => {
		const workerPath = p`app/workers/${name}.js`;
		const workerCode = fs.readFileSync(workerPath, "utf-8");

		return workerCode;
	});
	ipcMain.handle("import:misc", () => misc);
	//endregion

	ipcMain.handle("app:get-version", () => {
		return app.getVersion();
	});

	// Allow locally created blob URLs to be used as workers.
	session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
		const responseHeaders = { ...details.responseHeaders };
		const cspHeaderKey = Object.keys(responseHeaders).find(k => k.toLowerCase() === "content-security-policy");

		if (cspHeaderKey) {
			let csp = responseHeaders[cspHeaderKey][0];

			if (csp.includes("worker-src")) {
				csp = csp.replace("worker-src", "worker-src blob:");
			} else {
				csp = csp.replace("script-src", "script-src blob:");
			}

			responseHeaders[cspHeaderKey] = [csp];
		}

		callback({ cancel: false, responseHeaders });
	});

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
		state.chatWindow?.show();
	});
});

app.on("before-quit", () => {
	app.isQuitting = true;
	state.chatWindow?.destroy();
});

app.on("window-all-closed", () => {
	if (!platform.isMac && !state.tray) {
		app.quit();
	}
});