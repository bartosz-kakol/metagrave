const {contextBridge, ipcRenderer} = require("electron");

contextBridge.exposeInMainWorld("api", {
	/**
	 * @returns {Promise<string>}
	 */
	getAppVersion: () => ipcRenderer.invoke("app:get-version"),

	onOpaqueBackground: callback => ipcRenderer.on("splash:opaque-background", callback),
});
