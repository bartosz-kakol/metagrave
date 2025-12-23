import {BrowserWindow, Menu, WebContentsView, ipcMain, shell, app, dialog} from "electron";
import fs from "fs";
import path from "path";
import * as platform from "../../platform_detect.js";
import {p} from "../../utils.js";
import {setupTray} from "../tray.js";
import {setChatWindow} from "../state.js";
import misc from "../misc.json" with {type: "json"};
import getBaseMenuTemplate, {clearAllSessionData} from "../menu.js";

export function createChatWindow(continueFromURL, endedUpOnFacebookBusiness) {
	const titleBarHeight = 32;

	const chatWindow = new BrowserWindow({
		width: 1280,
		height: 780,
		title: "Metagrave",
		frame: !platform.isWin, // Windows: frameless; macOS: use hidden title bar with native traffic lights
		titleBarStyle: platform.isMac ? "hidden" : undefined,
		trafficLightPosition: platform.isMac ? {x: 12, y: 10} : undefined, // custom location for macOS traffic lights
		autoHideMenuBar: true,
		backgroundColor: "#1e1e1e",
		webPreferences: {
			nodeIntegration: false,
		},
	});

	const contentView = new WebContentsView({
		webPreferences: {
			nodeIntegration: false,
			sandbox: true,
			preload: p`app/preload/chat.js`,
		},
	});
	chatWindow.contentView.addChildView(contentView);

	setChatWindow(chatWindow);

	// Ensure macOS traffic lights are visible when using the hidden title bar
	if (platform.isMac) {
		chatWindow.setWindowButtonVisibility(true);
	}

	if (process.platform === "darwin") {
		app.dock.setMenu(
			Menu.buildFromTemplate([
				{role: "quit"},
			])
		);
	}

	const menuTemplate = getBaseMenuTemplate({
		contentView
	});
	const menu = Menu.buildFromTemplate(menuTemplate);
	Menu.setApplicationMenu(menu);

	if (!platform.isMac) {
		setupTray();
	}

	/** @type {?ElectronWebContentsView} */
	let titleBarView = null;
	let topOffset = 0;
	if (!platform.isOther) {
		titleBarView = new WebContentsView({
			webPreferences: {
				nodeIntegration: true,
				contextIsolation: false,
			},
		});
		chatWindow.contentView.addChildView(titleBarView);
		topOffset = titleBarHeight;
	}

	const applyLayout = () => {
		const [w, h] = chatWindow.getContentSize();
		if (titleBarView) {
			titleBarView.setBounds({x: 0, y: 0, width: w, height: titleBarHeight});
		}
		contentView.setBounds({x: 0, y: topOffset, width: w, height: Math.max(0, h - topOffset)});
	};

	if (titleBarView) {
		titleBarView.webContents.loadFile("embed/titlebar.html");
	}

	contentView.webContents.on("context-menu", (event, params) => {
		const template = [];

		if (params.mediaType === "image" && !!params.srcURL) {
			template.push(
				{
					label: "📋 Copy image to clipboard",
					click: () => {
						try {
							contentView.webContents.copyImageAt(params.x, params.y);
						} catch (e) {
							console.error(e);
						}
					},
				},
				{
					label: "💾 Save image",
					enabled: !!params.srcURL,
					click: () => {
						if (!params.srcURL) return;

						try {
							contentView.webContents.downloadURL(params.srcURL);
						} catch (e) {
							console.error(e);
						}
					},
				},
				{
					label: "🌎 Open image in Browser",
					enabled: !!params.srcURL,
					click: () => {
						if (!params.srcURL) return;

						shell.openExternal(params.srcURL)
							.catch(e => console.error(e));
					},
				},
				{type: "separator"}
			);
		}

		template.push(
			{role: "undo", enabled: params.editFlags.canUndo},
			{role: "redo", enabled: params.editFlags.canRedo},
			{type: "separator"},
			{role: "cut", enabled: params.editFlags.canCut},
			{role: "copy", enabled: params.editFlags.canCopy},
			{role: "paste", enabled: params.editFlags.canPaste},
			{type: "separator"},
			{role: "selectAll"}
		);

		const ctx = Menu.buildFromTemplate(template);
		ctx.popup({window: chatWindow});
	});

	const handleNavigate = (event, url) => {
		if (misc.recognizedMessengerURLs.some(urlPattern => url.startsWith(urlPattern))) {
			contentView.webContents.send("chat:chat-url-changed");

			return false;
		}

		event.preventDefault();
		console.log(`opening externally: ${url}`)
		shell.openExternal(url);

		return true;
	}

	contentView.webContents.on("will-navigate", (event, url) => {
		if (url.startsWith(misc.logoutURL)) {
			clearAllSessionData()
				.then(() => {
					app.relaunch();
					app.exit(0);
				})
				.catch(e => {
					console.error(e);
				});

			return;
		}

		handleNavigate(event, url);
	});
	contentView.webContents.on("did-navigate-in-page", (event, url) => {
		if (handleNavigate(event, url)) {
			contentView.webContents.navigationHistory.goBack();
		}
	});

	contentView.webContents.setWindowOpenHandler(({url}) => {
		if (url.startsWith("http:") || url.startsWith("https:")) {
			shell.openExternal(url);

			return {action: "deny"};
		}

		return {action: "allow"};
	});

	try {
		let platformName = "other";
		if (platform.isMac) platformName = "macos";
		else if (platform.isWin) platformName = "windows";

		const injectDir = p`inject`;
		const commonPath = path.join(injectDir, "common.css");
		const platformPath = path.join(injectDir, `${platformName}.css`);

		let cssToInject = "";
		if (fs.existsSync(commonPath)) {
			cssToInject += fs.readFileSync(commonPath, "utf8") + "\n";
		} else {
			console.warn(`⚠️ No common.css found in ${injectDir}`);
		}
		if (fs.existsSync(platformPath)) {
			cssToInject += fs.readFileSync(platformPath, "utf8") + "\n";
		} else {
			console.warn(`⚠️ No ${platformName}.css found in ${injectDir}`);
		}

		if (cssToInject.trim().length > 0) {
			const inject = () => {
				contentView.webContents.insertCSS(cssToInject)
					.catch(reason => {
						console.warn(`⚠️ Failed to inject CSS: ${reason}`);
					});
			};

			contentView.webContents.on("did-navigate", inject);

			if (contentView.webContents.isLoadingMainFrame() === false) {
				inject();
			}
		}
	} catch (e) {
		console.error(e);
	}

	applyLayout();
	chatWindow.on("resize", applyLayout);

	ipcMain.removeAllListeners("titlebar:window-control");
	ipcMain.on("titlebar:window-control", (event, action) => {
		if (!chatWindow) return;
		switch (action) {
			case "minimize":
				chatWindow.minimize();
				break;
			case "maximize":
				if (chatWindow.isMaximized()) chatWindow.unmaximize();
				else chatWindow.maximize();
				break;
			case "close":
				chatWindow.close();
				break;
		}
	});

	ipcMain.on("titlebar:open-profile-menu", event => {
		contentView.webContents.send("chat:open-profile-menu");
	});

	ipcMain.on("chat:set-profile", (event, avatarURL, name) => {
		if (titleBarView) {
			titleBarView.webContents.send("titlebar:set-profile", avatarURL, name);
		}
	});

	ipcMain.handle("chat:get-elements", event => {
		return misc.chatElements;
	});

	chatWindow.on("close", (event) => {
		event.preventDefault();
		chatWindow.hide();
	});

	chatWindow.on("closed", () => {
		setChatWindow(null);
	});

	contentView.webContents.loadURL(continueFromURL)
		.then(() => {
			if (endedUpOnFacebookBusiness) {
				dialog.showMessageBox(chatWindow, {
					type: "info",
					textWidth: 250,
					title: "Facebook Business does not support the classic Messenger interface",
					message:
						"It seems that Facebook tried to log you onto a Facebook Page profile connected to your account." +
						"\n\n" +
						"This may have happened because you switched to a Facebook Page profile and then closed the app. " +
						"\n\n" +
						"Since a Facebook Page profile is not supposed to be used with the classic Messenger interface, " +
						"the app has redirected you here, where you can switch back to your personal profile.",
					detail: "You can switch profiles using the button at the top right of the window.",
					buttons: ["Close"],
					cancelId: 0,
					defaultId: 0
				});
			}
		})

	return chatWindow;
}
