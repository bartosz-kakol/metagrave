import { Canvas, FontLibrary } from "skia-canvas";

FontLibrary.use("NativeEmojiFont", "/System/Library/Fonts/Apple Color Emoji.ttc");

const TARGET_SIZE = 192;
const CENTER = TARGET_SIZE / 2;

process.parentPort.on("message", async e => {
    // This function is responsible for rendering emojis that look native to the operating system as images.
    const { emoji, renderYOffset } = e.data;

    try {
        const canvas = new Canvas(TARGET_SIZE, TARGET_SIZE);
        const ctx = canvas.getContext("2d");

        ctx.font = `${TARGET_SIZE}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const centerX = CENTER;
        const centerY = CENTER + renderYOffset;

        ctx.fillText(emoji, centerX, centerY);

        const buffer = await canvas.toBuffer("webp", { quality: 0.67 });

        process.parentPort.postMessage({ emoji, buffer });
    } catch (err) {
        process.parentPort.postMessage({ emoji, error: err.message });
    }
});