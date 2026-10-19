#!/usr/bin/env node
/* Live check of feedback interpretation (bead d6cdc824 acceptance 2): 15
   phrases against the real model, each expected to move one setting in one
   direction. Needs a key (OPENAI_API_KEY or Keychain openai-api-key);
   costs a few cents; run on demand, not in CI.

     npm run test:model --workspace @ux-builder/theme-builder */

import OpenAI from "openai";
import { defaults } from "../../../packages/engine/src/index.js";
import { DEFAULT_MODEL, feedback } from "../api/feedback.mjs";
import { openaiKey } from "../api/key.mjs";

const key = openaiKey();
if (!key) { console.error("no OpenAI key: set OPENAI_API_KEY or add the Keychain item openai-api-key"); process.exit(2); }
const model = { name: process.env.BUILDER_MODEL ?? DEFAULT_MODEL, client: new OpenAI({ apiKey: key }) };

// [phrase, setting, direction]: direction +1 up, -1 down, 0 to zero.
const CASES = [
  ["more conservative, this is a law firm", "chromaScale", -1],
  ["too loud, tone it down", "chromaScale", -1],
  ["calmer and more serious", "chromaScale", -1],
  ["bolder, it needs more punch", "chromaScale", 1],
  ["more vibrant colours", "chromaScale", 1],
  ["brighter and more energetic", "chromaScale", 1],
  ["warmer", "hueShift", 1],
  ["make the blue a little warmer", "hueShift", 1],
  ["cooler", "hueShift", -1],
  ["a colder, more clinical blue", "hueShift", -1],
  ["plain grey backgrounds, no tint", "neutralTint", 0],
  ["less tinted backgrounds", "neutralTint", -1],
  ["the backgrounds should feel more branded", "neutralTint", 1],
  ["status colours should match the brand more", "stateHarmony", 1],
  ["keep status colours standard, not tinted by the brand", "stateHarmony", -1],
];
const options = [{ label: "faithful", strategy: "faithful", light: { structure: "#1F5FBF", accent: "#1F5FBF", ground: "#F7FAFF" }, dark: { structure: "#4383E6", accent: "#4383E6", ground: "#0F1215" } }];

let pass = 0;
for (const [phrase, setting, dir] of CASES) {
  const s = defaults();
  const r = await feedback({ body: { feedback: phrase, settings: s, options }, model });
  const v = r.changes[setting] ?? s[setting];
  const ok = dir === 0 ? v === 0 : Math.sign(v - s[setting]) === dir;
  if (ok) pass++;
  console.log(`${ok ? "pass" : "FAIL"}  ${phrase.padEnd(55)} ${setting} ${s[setting]} -> ${v}  "${r.explanation}"`);
}
console.log(`\n${pass}/${CASES.length} moved the expected setting in the expected direction`);
process.exit(pass === CASES.length ? 0 : 1);
