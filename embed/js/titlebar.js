const { ipcRenderer } = require("electron");
// noinspection JSFileReferences
const platform = require("../platform_detect");

let platformString = "other";

if (platform.isWin) {
	platformString = "windows";
} else if (platform.isMac) {
	platformString = "macos";
}

document.body.setAttribute("data-platform", platformString);

document.getElementById("min").addEventListener("click", () => {
	ipcRenderer.send("titlebar:window-control", "minimize");
});

document.getElementById("max").addEventListener("click", () => {
	ipcRenderer.send("titlebar:window-control", "maximize");
});

document.getElementById("close").addEventListener("click", () => {
	ipcRenderer.send("titlebar:window-control", "close");
});

ipcRenderer.on("titlebar:set-profile", (_e, avatarURL, name) => {
	// TODO
});
