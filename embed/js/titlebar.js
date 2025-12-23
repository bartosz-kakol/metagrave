const {ipcRenderer} = require("electron");
// noinspection JSFileReferences
const platform = require("../platform_detect.js");

let platformString = "other";

if (platform.isWin) {
	platformString = "windows";
} else if (platform.isMac) {
	platformString = "macos";
}

for (const action of ["minimize", "maximize", "close"]) {
	const elements = document.getElementsByClassName(action);

	for (const element of elements) {
		element.addEventListener("click", () => {
			ipcRenderer.send("titlebar:window-control", action);
		});
	}
}

document.getElementById("settings").addEventListener("click", () => {
	ipcRenderer.send("settings:open");
});

ipcRenderer.on("titlebar:set-profile", (_e, avatarURL, name) => {
	const profileElement = document.getElementById("profile");
	profileElement.style.visibility = "visible";

	const profilePfpElement = document.getElementById("profile-pfp");
	profilePfpElement.setAttribute("src", avatarURL);
	profilePfpElement.setAttribute("alt", name);

	const profileNameElement = document.getElementById("profile-name");
	profileNameElement.textContent = name;
});

ipcRenderer.on("titlebar:chat-url-changed", (_e, url) => {

});

document.addEventListener("DOMContentLoaded", () => {
	document.body.setAttribute("data-platform", platformString);

	const profilePfpElement = document.getElementById("profile-pfp");
	profilePfpElement.addEventListener("error", event => {
		console.warn(event);
		// Set empty image
		event.target.setAttribute("src", "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==");
	});

	document.getElementById("profile").addEventListener("click", () => {
		ipcRenderer.send("titlebar:open-profile-menu");
	});

	document.getElementById("close-media").addEventListener("click", () => {
		ipcRenderer.send("titlebar:close-media");
	});
});
