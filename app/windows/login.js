import {BrowserWindow, Menu, WebContentsView, app, dialog} from "electron";
import {getChatWindow} from "../state.js";
import {createChatWindow} from "./chat.js";
import getBaseMenuTemplate, {clearAllSessionData} from "../menu.js";
import misc from "../misc.json" with {type: "json"};
import {atLeastOneURLMatches, simpleLogger} from "../../utils.js";

const log = simpleLogger("windows/login");

export function createLoginWindow(onLoaded) {
	const addressBarHeight = 28;

	const loginWindow = new BrowserWindow({
		width: 800,
		minWidth: 800,
		height: 600,
		minHeight: 600,
		title: "Metagrave - Log in to Messenger",
		webPreferences: {
			nodeIntegration: false,
		},
		show: false,
	});

	const contentView = new WebContentsView({
		webPreferences: {
			nodeIntegration: false,
			sandbox: true,
		},
	});
	loginWindow.contentView.addChildView(contentView);

	const addressBarView = new WebContentsView({
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
		},
	});
	loginWindow.contentView.addChildView(addressBarView);

	const menuTemplate = getBaseMenuTemplate({
		contentView,
	});
	const menu = Menu.buildFromTemplate(menuTemplate);
	Menu.setApplicationMenu(menu);

	const applyLayout = () => {
		const [w, h] = loginWindow.getContentSize();
		addressBarView.setBounds({x: 0, y: 0, width: w, height: addressBarHeight});
		contentView.setBounds({x: 0, y: addressBarHeight, width: w, height: Math.max(0, h - addressBarHeight)});
	};
	applyLayout();
	loginWindow.on("resize", applyLayout);

	addressBarView.webContents.loadFile("embed/address_bar.html");

	loginWindow.on("closed", () => {
		log("destroying contentView and addressBarView");
		contentView.webContents.destroy();
		addressBarView.webContents.destroy();

		if (app.dontQuitOnCloseLoginWindow) return;

		log("dontQuitOnCloseLoginWindow = false | quitting app")

		app.isQuitting = true;
		app.quit();
	});

	loginWindow.webContents.on("context-menu", (event, params) => {
		const template = [
			{role: "undo", enabled: params.editFlags.canUndo},
			{role: "redo", enabled: params.editFlags.canRedo},
			{type: "separator"},
			{role: "cut", enabled: params.editFlags.canCut},
			{role: "copy", enabled: params.editFlags.canCopy},
			{role: "paste", enabled: params.editFlags.canPaste},
			{type: "separator"},
			{role: "selectAll"},
		];
		const ctx = Menu.buildFromTemplate(template);
		ctx.popup({window: getChatWindow()});
	});

	const initialURL = misc.initialURL;

	const updateAddressBar = (url, loading) => {
		try {
			addressBarView.webContents.send("address:update", {url, loading});
		} catch (_) {
		}
	};

	let currentURL = initialURL;

	contentView.webContents.on("did-start-loading", () => {
		log(`did-start-loading: ${currentURL}`);
		updateAddressBar(currentURL, true);
	});

	contentView.webContents.on("did-stop-loading", () => {
		log(`did-stop-loading: ${currentURL}`);
		updateAddressBar(currentURL, false);
	});

	let triedFixingLoginOnce = false;
	let loginBrokenWarningShown = false;
	let endedUpOnFacebookBusiness = false;

	contentView.webContents.on("did-navigate", (_e, url) => {
		currentURL = url;
		updateAddressBar(currentURL, contentView.webContents.isLoadingMainFrame());

		log(`did-navigate: ${currentURL}`);

		if (atLeastOneURLMatches(misc.recognizedMessengerURLs, url)) {
			app.dontQuitOnCloseLoginWindow = true;

			createChatWindow(url, endedUpOnFacebookBusiness);

			if (!loginWindow.isDestroyed()) {
				loginWindow.close();
			}

			onLoaded();

			return;
		}

		if (atLeastOneURLMatches(misc.businessURLs, url)) {
			endedUpOnFacebookBusiness = true;

			contentView.webContents.loadURL(misc.businessFallbackRedirectURL);

			return;
		}

		if (!atLeastOneURLMatches(misc.recognizedLoginURLs, url)) {
			if (!triedFixingLoginOnce) {
				contentView.webContents.loadURL(initialURL);
				triedFixingLoginOnce = true;

				return;
			}

			if (!loginBrokenWarningShown) {
				dialog.showMessageBox(loginWindow, {
					type: "warning",
					textWidth: 250,
					title: "Failed to log in",
					message:
						"There seems to be a problem with loading the login form. This could be due to a recent change in " +
						"Facebook's login system, but it could also be the fault of a bad session." +
						"\n\n" +
						"If you think this message is shown in error, choose \"Ignore\". If you want the app to try " +
						"loading the login form again, press \"Retry\"." +
						"\n\n" +
						"You can also try clearing your session. This WILL log you out of your account, but should fix the " +
						"issue completely.",
					buttons: ["Ignore", "Retry", "Clear session and try again"],
					cancelId: 0,
					defaultId: 0
				})
					.then(({response}) => {
						switch (response) {
							case 1:
								return;
							case 2:
								contentView.webContents.loadURL(initialURL);
								break
							case 3:
								clearAllSessionData()
									.then(() => {
										app.relaunch();
										app.exit(0);
									})
									.catch(e => {
										console.error(e);
									});
								break;
						}
					});
				loginBrokenWarningShown = true;
			}
		}

		loginWindow.show();
		onLoaded();
	});

	contentView.webContents.on("did-navigate-in-page", (_e, url) => {
		currentURL = url;
		updateAddressBar(currentURL, contentView.webContents.isLoadingMainFrame());
	});

	contentView.webContents.loadURL(initialURL);

	return loginWindow;
}
