/* @ux-builder/engine: the palette engine (FEAT-002, SD-001). */

export { analyse, analysePixels, candidateOf, isIdentity, foldDistance, IDENTITY, FOLD, FOLD_L_WEIGHT, SHARE, KEEP } from "./extract/analyse.js";
export { EngineError, deltaE, hexToOklch, oklchToHex, oklchToRgb, parseHex, rgbToOklch, toHex } from "./oklch.js";
export { ENGINE_VERSION, MIN_OPTIONS, REVIEW_THRESHOLD, generate, regenerate } from "./generate/generate.js";
export { SETTINGS, STRATEGIES, defaults, normalise, settingsSchema } from "./generate/settings.js";
export { checkAll, fitAppearance } from "./generate/fit.js";
