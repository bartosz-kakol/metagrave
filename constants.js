import { app } from "electron";
import path from "path";

export const USER_DATA_DIR = app.getPath("userData");
export const NATIVE_EMOJI_CACHE_DIR = path.join(USER_DATA_DIR, "native-emoji-cache");
