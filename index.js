const {app, dialog	} = require("electron");
const platform = require("./platform_detect");
const {getChatWindow, getTray} = require("./app/state");
const {createSplashWindow} = require("./app/windows/splash");
const {createLoginWindow} = require("./app/windows/login");
const Updater = require("./updater/updater");

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