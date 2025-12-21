const {app} = require("electron");
const fs = require("fs");
const EventEmitter = require("node:events");
const semver = require("semver");
const {p} = require("../utils");

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

		console.log(`Using updater config: ${configPath}`);

		return require(configPath);
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

module.exports = Updater;
