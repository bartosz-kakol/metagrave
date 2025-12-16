const {BrowserWindow, Menu, WebContentsView, app, ipcMain} = require("electron");
const {getChatWindow} = require("../state");
const {createChatWindow} = require("./chat");

function createLoginWindow(onLoaded) {
	const addressBarHeight = 28;

	const loginWindow = new BrowserWindow({
		width: 800,
		minWidth: 800,
		height: 600,
		minHeight: 600,
		webPreferences: {
			nodeIntegration: false,
		},
		show: false,
	});

	const menu = Menu.buildFromTemplate([
		{
			label: "File",
			submenu: [{role: "quit"}],
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
	]);
	Menu.setApplicationMenu(menu);

	const addressBarView = new WebContentsView({
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
		},
	});
	loginWindow.contentView.addChildView(addressBarView);

	const contentView = new WebContentsView({
		webPreferences: {
			nodeIntegration: false,
			sandbox: true,
		},
	});
	loginWindow.contentView.addChildView(contentView);

	const applyLayout = () => {
		const [w, h] = loginWindow.getContentSize();
		addressBarView.setBounds({x: 0, y: 0, width: w, height: addressBarHeight});
		contentView.setBounds({x: 0, y: addressBarHeight, width: w, height: Math.max(0, h - addressBarHeight)});
	};
	applyLayout();
	loginWindow.on("resize", applyLayout);

	addressBarView.webContents.loadFile("embed/address_bar.html");

	loginWindow.on("closed", () => {
		if (app.dontQuitOnCloseLoginWindow) return;
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

	const initialURL = "https://www.messenger.com";
	contentView.webContents.loadURL(initialURL);

	const updateAddressBar = (url, loading) => {
		try {
			addressBarView.webContents.send("address:update", {url, loading});
		} catch (_) {
		}
	};

	let currentURL = initialURL;

	contentView.webContents.on("did-start-loading", () => {
		console.log("did-start-loading: ", currentURL);
		updateAddressBar(currentURL, true);
	});

	contentView.webContents.on("did-stop-loading", () => {
		console.log("did-stop-loading: ", currentURL);
		updateAddressBar(currentURL, false);
	});

	contentView.webContents.on("did-navigate", (_e, url) => {
		currentURL = url;
		updateAddressBar(currentURL, contentView.webContents.isLoadingMainFrame());

		if (url.startsWith("https://www.messenger.com/t") || url.startsWith("https://www.messenger.com/e2ee")) {
			app.dontQuitOnCloseLoginWindow = true;
			createChatWindow(url);
			loginWindow.close();
		} else {
			loginWindow.show();
		}

		onLoaded();
	});

	contentView.webContents.on("did-navigate-in-page", (_e, url) => {
		currentURL = url;
		updateAddressBar(currentURL, contentView.webContents.isLoadingMainFrame());
	});

	return loginWindow;
}

module.exports = {createLoginWindow};
