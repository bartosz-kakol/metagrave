import {BrowserWindow, Menu, WebContentsView, session, ipcMain, shell, app} from "electron";
import fs from "fs";
import path from "path";
import * as platform from "../../platform_detect.js";
import {p} from "../../utils.js";
import {setupTray} from "../tray.js";
import {setChatWindow} from "../state.js";
import {createSettingsWindow} from "./settings.js";
import misc from "../misc.json" with {type: "json"};

async function clearAllSessionData() {
	await session.defaultSession.clearStorageData();
}

export function createChatWindow(continueFromURL) {
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

	const menuTemplate = [
		{
			label: "File",
			submenu: [
				{
					label: "Clear data and restart",
					click: () => {
						clearAllSessionData()
							.then(() => {
								app.relaunch();
								app.exit(0);
							})
							.catch(e => {
								console.error(e);
							});
					},
				},
				{
					label: "Open DevTools",
					click: () => contentView.webContents.openDevTools({mode: "detach"}),
				}
			],
		},
		{
			label: "Edit",
			submenu: [
				{role: "undo"},
				{role: "redo"},
				{type: "separator"},
				{role: "cut"},
				{role: "copy"},
				{role: "paste"},
				{role: "delete"},
				{type: "separator"},
				{role: "selectAll"},
			],
		},
		{
			label: "View",
			submenu: [
				{
					label: "Reload",
					accelerator: "CmdOrCtrl+R",
					click: () => contentView.webContents.reload(),
				},
				{type: "separator"},
				{
					label: "Reset Zoom",
					accelerator: "CmdOrCtrl+0",
					click: () => contentView.webContents.setZoomLevel(0),
				},
				{
					label: "Zoom In",
					accelerator: "CmdOrCtrl+Plus",
					click: () => {
						const currentZoom = contentView.webContents.getZoomLevel();
						contentView.webContents.setZoomLevel(currentZoom + 0.5);
					},
				},
				{
					label: "Zoom Out",
					accelerator: "CmdOrCtrl+-",
					click: () => {
						const currentZoom = contentView.webContents.getZoomLevel();
						contentView.webContents.setZoomLevel(currentZoom - 0.5);
					},
				},
			],
		},
		{role: "windowMenu"},
		{role: "help"},
	];

	if (platform.isMac) {
		menuTemplate.unshift({
			label: app.name,
			submenu: [
				{role: "about"},
				{type: "separator"},
				{
					label: "Settings...",
					accelerator: "Cmd+,",
					click: () => {
						createSettingsWindow();
					},
				},
				{type: "separator"},
				{role: "services"},
				{type: "separator"},
				{role: "hide"},
				{role: "hideOthers"},
				{role: "unhide"},
				{type: "separator"},
				{role: "quit"},
			],
		});
	} else {
		menuTemplate.filter(m => m.label === "File")[0].submenu.push(
			{
				label: "Settings",
				click: () => {
					createSettingsWindow();
				},
			},
			{type: "separator"},
			{role: "quit"},
		);
	}

	const menu = Menu.buildFromTemplate(menuTemplate);
	Menu.setApplicationMenu(menu);

	if (!platform.isMac) {
		setupTray();
	}

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
		topOffset = 32;
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

	const contentView = new WebContentsView({
		webPreferences: {
			nodeIntegration: false,
			sandbox: true,
			preload: p`app/preload/chat.js`,
		},
	});
	chatWindow.contentView.addChildView(contentView);

	contentView.webContents.on("context-menu", (event, params) => {
		const template = [];

		const isImage = params.mediaType === "image" && !!params.srcURL;
		if (isImage) {
			template.push(
				{
					label: "Copy image to clipboard",
					click: () => {
						try {
							contentView.webContents.copyImageAt(params.x, params.y);
						} catch (_) {
						}
					},
				},
				{
					label: "Open image in Browser",
					enabled: !!params.srcURL,
					click: () => {
						if (params.srcURL) shell.openExternal(params.srcURL);
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

	contentView.webContents.loadURL(continueFromURL);

	return chatWindow;
}
