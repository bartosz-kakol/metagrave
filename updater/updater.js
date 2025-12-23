import {app} from "electron";
import fs from "fs";
import EventEmitter from "node:events";
import semver from "semver";
import {p, simpleLogger} from "../utils.js";

/**
 * @typedef {Object} UpdaterOptions
 * @property {string} channel
 */

/**
 * @typedef {Object} UpdaterConfig
 * @property {Record<string, {friendlyName: string, endpoint: string}>} channels
 */

/**
 * @typedef {Object} UpdaterVersionMetadata
 * @property {string} version
 * @property {string} minimumCompatibleVersion
 * @property {Record<string, {url: string, sha256: string}>} artifacts
 */

const log = simpleLogger("📡 updater");


class Updater extends EventEmitter {
	/** @type {UpdaterConfig} */
	#config;

	/** @type {string} */
	channel;

	/**
	 * @param options {UpdaterOptions}
	 */
	constructor(options) {
		super();

		this.#config = Updater.#readConfig();

		this.channel = options.channel;
	}

	/**
	 * @returns {UpdaterConfig}
	 */
	static #readConfig() {
		const configPath = p`updater/config.json`;

		if (!fs.existsSync(configPath)) {
			throw new Error(`Updater config file not found: ${configPath}`);
		}

		log(`Using updater config: ${configPath}`);

		return JSON.parse(fs.readFileSync(configPath, "utf8"));
	}

	/**
	 * @returns {UpdaterConfig}
	 */
	get config() {
		return structuredClone(this.#config);
	}

	async checkForUpdates() {
		const channel = this.#config.channels[this.channel];

		if (!channel) {
			throw new Error(`Invalid channel: "${this.channel}"`);
		}

		const endpoint = channel.endpoint;

		const endpointResponse = await fetch(endpoint);
		/** @type {UpdaterVersionMetadata} */
		const newestVersionMetadata = await endpointResponse.json();

		console.log(newestVersionMetadata);
	}
}

export default Updater;
