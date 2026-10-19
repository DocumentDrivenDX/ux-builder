/* Node adapter: files, node:zlib and sha256 for the brand file's logo hash. */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { load } from "../tokens/compose.mjs";
import { dirname, resolve } from "node:path";
import { EngineError, analyse, generate, regenerate } from "./src/index.js";

export * from "./src/index.js";

export const inflate = async (bytes) => new Uint8Array(inflateSync(bytes));
export const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

export async function analyseFile(path) {
  const bytes = new Uint8Array(readFileSync(path));
  return { ...(await analyse(bytes, { inflate })), sha256: sha256(bytes) };
}

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
let cached;
/* The shared design systems from tokens/, validated by the build's own loader. */
export function designSystems() {
  cached ??= [...load(`${ROOT}tokens`, `${ROOT}brand`).designSystems.values()];
  return cached;
}

export async function generateFromFile(path, settings = {}) {
  const analysis = await analyseFile(path);
  return { analysis, ...generate(analysis, settings, { designSystems: designSystems() }) };
}

/* Regenerate a brand file written by the engine: its logo must still have the
   recorded hash (a changed logo is a new brand, not a regeneration). */
export async function regenerateFile(brandPath) {
  const brand = JSON.parse(readFileSync(brandPath, "utf8"));
  const logo = brand.generation?.logo;
  if (!logo) throw new EngineError(`${brandPath}: no generation.logo, so there is nothing to regenerate from`);
  const logoPath = resolve(dirname(brandPath), logo.path);
  const bytes = new Uint8Array(readFileSync(logoPath));
  if (sha256(bytes) !== logo.sha256) throw new EngineError(`${logo.path} has changed since the brand was generated (sha256 differs); generate a new brand instead`);
  const analysis = await analyse(bytes, { inflate });
  return regenerate(brand, analysis, { designSystems: designSystems() });
}
