/* @ux-builder/visuals/node: render() with themes loaded by name from @ux-builder/tokens. */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import * as core from "./index.mjs";

export * from "./index.mjs";

const resolved = join(dirname(createRequire(import.meta.url).resolve("@ux-builder/tokens/package.json")), "dist/resolved");

/** A resolved theme by name, in one appearance, or both for "both". */
export function loadTheme(name, appearance = "light") {
  const read = (a) => {
    try { return JSON.parse(readFileSync(join(resolved, `${name}.${a}.json`), "utf8")); }
    catch { throw Object.assign(new Error(`No theme ${name} in ${a}`), { code: "VISUAL_THEME" }); }
  };
  return appearance === "both" ? { light: read("light"), dark: read("dark") } : read(appearance);
}

const withTheme = (options) => (typeof options.theme === "string" ? { ...options, theme: loadTheme(options.theme, options.appearance ?? "light") } : options);

export const render = (document, options = {}) => core.render(document, withTheme(options));
export const draw = (document, options = {}) => core.draw(document, withTheme(options));
export const renderAll = (documents, options = {}) => core.renderAll(documents, withTheme(options));
