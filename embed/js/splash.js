const versionContainer = document.getElementById("version");

window.api.getAppVersion()
	.then(version => {
		versionContainer.innerText = version;
	});

window.api.onOpaqueBackground(() => {
	document.body.classList.add("opaque-background");
});
