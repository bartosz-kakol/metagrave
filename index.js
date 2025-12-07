const {app, BrowserWindow, Menu, ipcMain, WebContentsView, session} = require("electron");
const fs = require("fs");
const path = require("path");
const p = require("./platform_detect");

/** @type {ElectronBrowserWindow} */
let splashWindow;
/** @type {ElectronBrowserWindow} */
let loginWindow;
/** @type {ElectronBrowserWindow} */
let chatWindow;

function createSplashWindow() {
    splashWindow = new BrowserWindow({
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
        backgroundColor: !p.isOther ? "#00000000" : "#1A1A1A",
        vibrancy: p.isMac ? "under-window" : undefined,
        visualEffectState: p.isMac ? "active" : undefined,
        webPreferences: {
            nodeIntegration: false,
            sandbox: true
        }
    });

    splashWindow.setMenuBarVisibility(false);

    if (p.isWin && typeof splashWindow.setBackgroundMaterial === "function") {
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
        splashWindow = null;
    });

    splashWindow.loadFile("embed/splash.html");

	if (!app.isQuitting) {
		createLoginWindow(
			() => {
				if (splashWindow && !splashWindow.isDestroyed()) {
					splashWindow.close();
				}
			}
		);
	}
}

function createLoginWindow(onLoaded) {
    const addressBarHeight = 28;

    loginWindow = new BrowserWindow({
        width: 800,
        minWidth: 800,
        height: 600,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false
        },
        show: false
    });

    const menu = Menu.buildFromTemplate([
        {
            label: "File",
            submenu: [
                {role: "quit"}
            ]
        }
    ]);
    Menu.setApplicationMenu(menu);

    const addressBarView = new WebContentsView({
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    loginWindow.contentView.addChildView(addressBarView);

    const contentView = new WebContentsView({
        webPreferences: {
            nodeIntegration: false,
            sandbox: true
        }
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

    const initialURL = "https://www.messenger.com";
    contentView.webContents.loadURL(initialURL);

    const updateAddressBar = (url, loading) => {
        try {
            addressBarView.webContents.send("address:update", {url, loading});
        } catch (_) {}
    };

    let currentURL = initialURL;

    contentView.webContents.on("did-start-loading", () => {
		console.log("did-start-loading: ", currentURL);
		updateAddressBar(currentURL, true)
	});

    contentView.webContents.on("did-stop-loading", () => {
		console.log("did-stop-loading: ", currentURL);
		updateAddressBar(currentURL, false)
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
}

/**
 * @param continueFromURL {string}
 */
function createChatWindow(continueFromURL) {
    const titleBarHeight = 32;

    chatWindow = new BrowserWindow({
        width: 1280,
        height: 780,
        title: "Metagrave",
        frame: !p.isWin, // Windows: frameless; macOS: use hidden title bar with native traffic lights
        titleBarStyle: p.isMac ? "hidden" : undefined,
        trafficLightPosition: p.isMac ? {x: 12, y: 10} : undefined, // custom location for macOS traffic lights
        autoHideMenuBar: true,
        backgroundColor: "#1e1e1e",
        webPreferences: {
            nodeIntegration: false
        }
    });

    // Ensure macOS traffic lights are visible when using the hidden title bar
    if (p.isMac) {
		chatWindow.setWindowButtonVisibility(true);
    }

	if (process.platform === "darwin") {
		app.dock.setMenu(Menu.buildFromTemplate([
			{role: "quit"}
		]));
	}

	const menu = Menu.buildFromTemplate([
        {
            label: "File",
            submenu: [
				{
					label: "Clear data and restart",
					click: () => {
						session.defaultSession.clearStorageData();
						app.relaunch();
						app.exit(0);
					}
				},
				{type: "separator"},
				{role: "quit"}
			]
        },
        {
            label: "View",
            submenu: [
                {role: "reload"},
                {role: "toggleDevTools"},
                {type: "separator"},
                {role: "resetZoom"},
                {role: "zoomIn"},
                {role: "zoomOut"},
                {type: "separator"},
                {role: "togglefullscreen"}
            ]
        }
    ]);
    Menu.setApplicationMenu(menu);

    let titleBarView = null;
    let topOffset = 0;
    if (p.isWin) {
        titleBarView = new WebContentsView({
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
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
        titleBarView.webContents.loadFile("embed/windows_titlebar.html");
    }

    const contentView = new WebContentsView({
        webPreferences: {
            nodeIntegration: false,
            sandbox: true
        }
    });
    chatWindow.contentView.addChildView(contentView);

    try {
		let platform = "linux";

		if 		(p.isMac) 	platform = "darwin";
		else if (p.isWin) 	platform = "win32";

        const appPath = app.getAppPath();
        const injectDir = path.join(appPath, "inject");
        const commonPath = path.join(injectDir, "common.css");
        const platformPath = path.join(injectDir, `${platform}.css`);

        let cssToInject = "";

        if (fs.existsSync(commonPath)) {
            cssToInject += fs.readFileSync(commonPath, "utf8") + "\n";
        }

        if (fs.existsSync(platformPath)) {
            cssToInject += fs.readFileSync(platformPath, "utf8") + "\n";
        }

        if (cssToInject.trim().length > 0) {
            const inject = () => {
				contentView.webContents.insertCSS(cssToInject).catch(() => {});
            };

			contentView.webContents.on("did-finish-load", inject);

            if (contentView.webContents.isLoadingMainFrame() === false) {
                inject();
            }
        }
    } catch (e) {
        console.error(e);
    }

    applyLayout();

    chatWindow.on("resize", applyLayout);

    if (p.isWin) {
        ipcMain.removeAllListeners("window-control");
        ipcMain.on("window-control", (event, action) => {
            if (!chatWindow) return;
            switch (action) {
                case "minimize":
                    chatWindow.minimize();
                    break;
                case "maximize":
                    if (chatWindow.isMaximized()) chatWindow.unmaximize(); else chatWindow.maximize();
                    break;
                case "close":
                    chatWindow.close();
                    break;
            }
        });
    }

	chatWindow.on("close", event => {
		if (p.isMac) {
			event.preventDefault();
			chatWindow.hide();
		}
    });

	chatWindow.on("closed", () => {
		chatWindow = null;
	});

    contentView.webContents.loadURL(continueFromURL);
}

app.whenReady().then(() => {
    createSplashWindow();

    app.on("activate", () => {
        chatWindow?.show();
    });
});

app.on("before-quit", () => {
    app.isQuitting = true;
    chatWindow?.destroy();
});

app.on("window-all-closed", () => {
	if (!p.isMac) {
		app.quit();
	}
});
