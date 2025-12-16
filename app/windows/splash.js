const {BrowserWindow, app} = require("electron");
const platform = require("../../platform_detect");

function createSplashWindow() {
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
		backgroundColor: !platform.isOther ? "#00000000" : "#1A1A1A",
		vibrancy: platform.isMac ? "under-window" : undefined,
		visualEffectState: platform.isMac ? "active" : undefined,
		webPreferences: {
			nodeIntegration: false,
			sandbox: true,
		},
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
		splashWindow.show();
	});

	splashWindow.on("closed", () => {
		// no shared state to clean up
	});

	splashWindow.loadFile("embed/splash.html");

	return splashWindow;
}

module.exports = {createSplashWindow};
