const {app} = require("electron");
const path = require("path");

const appPath = app.getAppPath();

/**
 * @param template {string[]}
 * @param args {Array}
 */
function p(template, ...args) {
	let string = template[0] ?? "";

	for (let i = 0; i < args.length; i++) {
		string += `${args[i]}${template[i + 1]}`;
	}

	const pathElements = string.split("/");

	return path.join(appPath, ...pathElements);
}

module.exports = {p};
