const {app} = require("electron");
const platform = require("./platform_detect");
const {getChatWindow, getTray} = require("./app/state");
const {createSplashWindow} = require("./app/windows/splash");
const {createLoginWindow} = require("./app/windows/login");

app.whenReady().then(() => {
	const splashWindow = createSplashWindow();

	if (!app.isQuitting) {
		createLoginWindow(() => {
			if (splashWindow && !splashWindow.isDestroyed()) {
				splashWindow.close();
			}
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