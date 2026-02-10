import { Tray, Menu, app } from "electron";
import { p } from "../utils.js";
import state from "./state.js";

const TRAY_UUID = "a3883e0d-0636-4a7b-a5b8-f0e57b861c62";

export function setupTray() {
	const tray = new Tray(
		process.platform === "win32" ? p`resources/tray/win.ico` : p`resources/tray/default.png`,
		TRAY_UUID
	);

	state.tray = tray;

	tray.setToolTip("Metagrave");

	tray.setContextMenu(
		Menu.buildFromTemplate([
			{ label: "Open", click: () => state.chatWindow?.show() },
			{ type: "separator" },
			{ label: "Quit", click: () => app.quit() },
		])
	);

	tray.on("click", () => {
		state.chatWindow?.show();
	});

	return tray;
}
