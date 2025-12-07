const { ipcRenderer } = require("electron");
const spinner = document.getElementById("spinner");
const urlEl = document.getElementById("url");

function setState(state) {
	if (!state) return;

	const { url, loading } = state;
	urlEl.textContent = url || "";

	if (loading) {
		spinner.classList.add("loading");
	} else {
		spinner.classList.remove("loading");
	}
}

ipcRenderer.on("address:update", (_e, state) => setState(state));

setState({ url: "", loading: true });
