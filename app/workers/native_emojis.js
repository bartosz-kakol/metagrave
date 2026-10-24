import { Canvas } from "skia-canvas";

const TARGET_SIZE = 192;
const CENTER = TARGET_SIZE / 2;

/**
 * @typedef {Object} PlatformParameters
 * @property {number} renderYOffset
 */

/** @type {Record<typeof process.platform | "default", PlatformParameters>} */
const platformParameters = {
    "darwin": {
        renderYOffset: 8,
    },
    "win32": {
        renderYOffset: 8,
    },
    default: {
        renderYOffset: 8,
    },
};

const currentPlatformParameters = platformParameters[process.platform] ?? platformParameters.default;

process.parentPort.on("message", async e => {
    // This function is responsible for rendering emojis that look native to the operating system as images.
    const { emoji } = e.data;

    try {
        const canvas = new Canvas(TARGET_SIZE, TARGET_SIZE);
        const ctx = canvas.getContext("2d");

        ctx.font = `${TARGET_SIZE}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const centerX = CENTER;
        const centerY = CENTER + currentPlatformParameters.renderYOffset;

        ctx.fillText(emoji, centerX, centerY);

        const buffer = await canvas.toBuffer("webp", { quality: 0.67 });

        process.parentPort.postMessage({ emoji, buffer });
    } catch (err) {
        process.parentPort.postMessage({ emoji, error: err.message });
    }
});