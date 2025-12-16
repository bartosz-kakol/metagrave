const {Tray, Menu, app} = require("electron");
const {p} = require("../utils");
const {getChatWindow, setTray} = require("./state");

function setupTray() {
	const tray = new Tray(
		process.platform === "win32" ? p`resources/tray/win.ico` : p`resources/tray/default.png`,
		"a3883e0d-0636-4a7b-a5b8-f0e57b861c62"
	);

	setTray(tray);

	tray.setToolTip("Metagrave");

	tray.setContextMenu(
		Menu.buildFromTemplate([
			{label: "Open", click: () => getChatWindow()?.show()},
			{type: "separator"},
			{label: "Quit", click: () => app.quit()},
		])
	);

	tray.on("click", () => {
		getChatWindow()?.show();
	});

	return tray;
}

module.exports = {setupTray};
