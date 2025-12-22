import {contextBridge, ipcRenderer} from "electron";

contextBridge.exposeInMainWorld("api", {
	/**
	 * @returns {Promise<string>}
	 */
	getAppVersion: () => ipcRenderer.invoke("app:get-version"),

	/**
	 * @param callback {function}
	 */
	onRequestNoTransparency: callback => void ipcRenderer.on("splash:request-no-transparency", callback),
});
