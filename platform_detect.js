export const isMac =
	typeof process.env.METAGRAVE_DEBUG_ISMAC === "string" ?
		process.env.METAGRAVE_DEBUG_ISMAC === "1"
		:
		process.platform === "darwin";

export const isWin =
	typeof process.env.METAGRAVE_DEBUG_ISWIN === "string" ?
		process.env.METAGRAVE_DEBUG_ISWIN === "1"
		:
		process.platform === "win32";

export const isOther = !isMac && !isWin;
