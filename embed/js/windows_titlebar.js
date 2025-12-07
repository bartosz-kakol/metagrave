const { ipcRenderer } = require("electron");

document.getElementById("min").addEventListener("click", () => {
	ipcRenderer.send("window-control", "minimize")
});

document.getElementById("max").addEventListener("click", () => {
	ipcRenderer.send("window-control", "maximize")
});

document.getElementById("close").addEventListener("click", () => {
	ipcRenderer.send('window-control', "close")
});
