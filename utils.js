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

/**
 * Returns whether the given URL (`url`) starts with at least one of the given URL patterns (`urlPatterns`).
 * @param urlPatterns {string[]}
 * @param url {string}
 * @returns {boolean}
 */
export function atLeastOneURLMatches(urlPatterns, url) {
	return urlPatterns.some(pattern => url.startsWith(pattern));
}

/**
 * @param namespace {string}
 * @returns {(msg: string, ...args: any[]) => void}
 */
export function simpleLogger(namespace) {
	return (msg, ...args) => console.log(`[${namespace}] ${msg}`, ...args);
}
