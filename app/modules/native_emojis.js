import { utilityProcess } from "electron";
import { p } from "../../utils.js";
import fs from "fs";
import path from "path";

const MAX_THREAD_COUNT = 5;

class NativeEmojis {
    /** @type {string} */
    #cacheDirPath;

    /** @type {Map<string, ArrayBuffer>} */
    #inMemoryCache = new Map();

    /** @type {number} */
    #renderYOffset;

    /** @type {Map<string, {resolve: (data: ArrayBuffer) => any, reject (err: Error) => any}[]} */
    #callbacks = new Map();

    /** @type {import("electron").UtilityProcess[]} */
    #renderThreads = [];

    /** @type {number} */
    #renderThreadChooser = 0;

    /**
     * @param {Object} param0
     * @param {string} param0.cacheDirPath
     * @param {number} param0.renderYOffset
     */
    constructor({ cacheDirPath, renderYOffset }) {
        this.#cacheDirPath = cacheDirPath;
        this.#renderYOffset = renderYOffset;
    }

    /**
     * @param {string} emoji
     * @param {(data: ArrayBuffer) => any} resolve
     * @param {(err: Error) => any} reject
     * @returns {boolean}
     */
    #addCallback(emoji, resolve, reject) {
        if (!this.#callbacks.has(emoji)) {
            this.#callbacks.set(emoji, [{ resolve, reject }]);

            return true;
        }

        this.#callbacks.get(emoji).push({ resolve, reject });

        return false;
    }

    /**
     * @param {string} emoji
     */
    #runRender(emoji) {
        if (this.#renderThreadChooser > MAX_THREAD_COUNT) {
            this.#renderThreadChooser = 0;
        }

        if (this.#renderThreadChooser >= this.#renderThreads.length) {
            const childProcess = utilityProcess.fork(p`app/workers/native_emojis.js`);

            childProcess.on("message", data => {
                if (data.error) {
                    const err = new Error(`[native_emojis] Error rendering emoji ${data.emoji}:\n${data.error}`)

                    const callbacks = this.#callbacks.get(data.emoji);
                    callbacks.forEach(cb => cb.reject(err));

                    return;
                }

                const callbacks = this.#callbacks.get(data.emoji);
                callbacks.forEach(cb => cb.resolve(data.buffer));

                this.#inMemoryCache.set(data.emoji, data.buffer);

                const outPath = path.join(this.#cacheDirPath, data.emoji);
                fs.writeFileSync(outPath, Buffer.from(data.buffer));
            });

            this.#renderThreads.push(childProcess);
        }

        const childProcess = this.#renderThreads[this.#renderThreadChooser++];

        childProcess.postMessage({
            emoji,
            renderYOffset: this.#renderYOffset,
        });
    }

    /**
     * @param {string} emoji
     * @returns {Promise<?ArrayBuffer>}
     */
    #getFromCache(emoji) {
        if (this.#inMemoryCache.has(emoji)) {
            return Promise.resolve(this.#inMemoryCache.get(emoji));
        }

        return new Promise((resolve, reject) => {
            const cachedFilePath = path.join(this.#cacheDirPath, emoji);

            if (fs.existsSync(cachedFilePath)) {
                fs.readFile(cachedFilePath, (err, data) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    const buffer = data.buffer.slice(
                        data.byteOffset,
                        data.byteOffset + data.byteLength
                    );
                    this.#inMemoryCache.set(emoji, buffer);

                    resolve(buffer);
                });

                return;
            }

            resolve(null);
        });
    }

    /**
     * @param {string} emoji
     * @returns {Promise<ArrayBuffer>}
     */
    get(emoji) {
        return new Promise((resolve, reject) => {
            const isFirst = this.#addCallback(emoji, resolve, reject);

            if (!isFirst) {
                return;
            }

            this.#getFromCache(emoji)
                .then(buffer => {
                    if (buffer === null) {
                        this.#runRender(emoji);

                        return;
                    }

                    const callbacks = this.#callbacks.get(emoji);

                    callbacks.forEach(cb => cb.resolve(buffer));
                })
                .catch(err => {
                    const callbacks = this.#callbacks.get(emoji);

                    callbacks.forEach(cb => cb.reject(err));
                });
        });
    }
}

export default NativeEmojis;
