import {BrowserWindow, app, ipcMain} from "electron";
import * as platform from "../../platform_detect.js";
import {p} from "../../utils.js";

export function createSplashWindow() {
	const splashWindow = new BrowserWindow({
		width: 400,
		height: 150,
		frame: false,
		transparent: true,
		resizable: false,
		movable: false,
		alwaysOnTop: true,
		center: true,
		show: false,
		skipTaskbar: true,
		backgroundColor: "#00000000",
		vibrancy: platform.isMac ? "under-window" : undefined,
		visualEffectState: platform.isMac ? "active" : undefined,
		webPreferences: {
			nodeIntegration: false,
			sandbox: true,
			preload: p`app/preload/splash.js`,
		},
	});

	ipcMain.handle("app:get-version", () => {
		return app.getVersion();
	});

	splashWindow.setMenuBarVisibility(false);

	if (platform.isWin && typeof splashWindow.setBackgroundMaterial === "function") {
		try {
			splashWindow.setBackgroundMaterial("acrylic");
		} catch (_) {
			// ignore if not supported
		}
	}

	splashWindow.once("ready-to-show", () => {
		if (platform.isOther) {
			splashWindow.webContents.send("splash:request-no-transparency");
		}

		splashWindow.show();
	});

	splashWindow.on("closed", () => {
		// no shared state to clean up
	});

	splashWindow.loadFile("embed/splash.html");

	return splashWindow;
}
