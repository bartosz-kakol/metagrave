const {app, BrowserWindow, Menu, ipcMain, WebContentsView} = require("electron");
const fs = require("fs");
const path = require("path");

/** @type {ElectronBrowserWindow} */
let loginWindow;
/** @type {ElectronBrowserWindow} */
let chatWindow;

function createLoginWindow() {
	loginWindow = new BrowserWindow({
		width: 800,
		height: 600,
		webPreferences: {
			nodeIntegration: false
		}
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

	loginWindow.loadURL("https://www.messenger.com");

	loginWindow.webContents.on("did-navigate", (event, url) => {
		if (url.startsWith("https://www.messenger.com/t") || url.startsWith("https://www.messenger.com/e2ee")) {
			createChatWindow(url);
			loginWindow.close();
		}
	});
}

/**
 * @param continueFromURL {string}
 */
function createChatWindow(continueFromURL) {
    const isMac = process.platform === "darwin";
    const isWin = process.platform === "win32";

    const titleBarHeight = 32;

    chatWindow = new BrowserWindow({
        width: 1280,
        height: 780,
        title: "Metagrave",
        frame: !isWin, // Windows: frameless; macOS: use hidden title bar with native traffic lights
        titleBarStyle: isMac ? "hidden" : undefined,
        trafficLightPosition: isMac ? {x: 12, y: 10} : undefined, // custom location for macOS traffic lights
        autoHideMenuBar: true,
        backgroundColor: "#1e1e1e",
        webPreferences: {
            nodeIntegration: false
        }
    });

    // Ensure macOS traffic lights are visible when using the hidden title bar
    if (isMac) {
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
    if (isWin) {
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
        titleBarView.webContents.loadFile("windows_titlebar.html");
    }

    const contentView = new WebContentsView({
        webPreferences: {
            nodeIntegration: false,
            sandbox: true
        }
    });
    chatWindow.contentView.addChildView(contentView);

    try {
        const platform = process.platform; // e.g. "darwin", "win32", "linux"
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

    if (isWin) {
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
        event.preventDefault();
        chatWindow.hide();
    });

	chatWindow.on("closed", () => {
		chatWindow = null;
	});

    contentView.webContents.loadURL(continueFromURL);
}

app.whenReady().then(() => {
	createLoginWindow();

	app.on("activate", () => {
		chatWindow?.show();
	});
});

app.on("before-quit", () => {
	chatWindow?.destroy();
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});
