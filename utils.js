import {app} from "electron";
import path from "path";

const appPath = app.getAppPath();

/**
 * Constructs a full path to a given resource that works in both development and production environments.
 *
 * **To be used with template strings like this:**
 * ```js
 * const fullPath = p`resources/images/image.png`;
 * ```
 * @param template {string[]}
 * @param args {Array}
 * @returns {string}
 */
export function p(template, ...args) {
	let string = template[0] ?? "";

	for (let i = 0; i < args.length; i++) {
		string += `${args[i]}${template[i + 1]}`;
	}

	const pathElements = string.split("/");

	return path.join(appPath, ...pathElements);
}
