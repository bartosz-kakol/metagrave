import {app, session} from "electron";
import * as platform from "../platform_detect.js";
import {createSettingsWindow} from "./windows/settings.js";

export async function clearAllSessionData() {
	await session.defaultSession.clearStorageData();
}

export default function getBaseMenuTemplate({contentView, additionalMenuItems = []}) {
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
		...additionalMenuItems,
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
			{type: "separator"},
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

	return menuTemplate;
}
