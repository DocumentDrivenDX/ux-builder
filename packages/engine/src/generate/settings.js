/* The settings schema (SD-001 Settings, US-009). The only thing ADR-014's
   interpreter may change. Out-of-range values are clamped and reported;
   unknown names are rejected. Every value is a number or a string, as the
   brand file's generation.settings requires. */

import { EngineError } from "../oklch.js";

export const STRATEGIES = ["faithful", "muted", "vibrant", "neutral-accent", "two-colour"];

export const SETTINGS = {
  strategies: { type: "string", default: STRATEGIES.join(","), description: "Which strategies run: a comma-separated subset of " + STRATEGIES.join(", ") + "." },
  primaryCandidate: { type: "integer", min: 0, max: 2, default: 0, description: "Which extracted colour is the brand colour (0 is the most covered)." },
  secondaryCandidate: { type: "integer", min: -1, max: 2, default: -1, description: "Accent source for two-colour; -1 picks the next candidate at least 30° away in hue." },
  hueShift: { type: "number", min: -30, max: 30, default: 0, description: "Degrees to rotate the brand colour and the neutrals' tint." },
  chromaScale: { type: "number", min: 0.5, max: 1.5, default: 1, description: "Multiplies each strategy's brand chroma." },
  neutralTint: { type: "number", min: 0, max: 2, default: 1, description: "Multiplies each strategy's neutral chroma; 0 gives pure greys." },
  groundLight: { type: "number", min: 0.94, max: 1, default: 0.985, description: "OKLCH lightness of the light page ground." },
  groundDark: { type: "number", min: 0.1, max: 0.26, default: 0.18, description: "OKLCH lightness of the dark page ground." },
  stateHarmony: { type: "number", min: 0, max: 1, default: 0.5, description: "How far status hues lean toward the brand hue (at most 15°)." },
  minContrast: { type: "number", min: 4.5, max: 7, default: 4.5, description: "Contrast floor for fitting; never below the 4.5:1 gate." },
  suggestedHue: { type: "number", min: 0, max: 360, default: 250, description: "Brand hue used only for monochrome logos." },
  appearances: { type: "string", enum: ["light,dark", "light", "dark"], default: "light,dark", description: "Which appearances to produce." },
};

/* JSON Schema for the interpreter's tool call. */
export const settingsSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "Palette engine settings (SD-001)",
  type: "object",
  additionalProperties: false,
  properties: Object.fromEntries(Object.entries(SETTINGS).map(([k, s]) => [k, {
    type: s.type, description: s.description, default: s.default,
    ...(s.min !== undefined && { minimum: s.min, maximum: s.max }),
    ...(s.enum && { enum: s.enum }),
    ...(k === "strategies" && { pattern: `^(${STRATEGIES.join("|")})(,(${STRATEGIES.join("|")}))*$` }),
  }])),
};

export const defaults = () => Object.fromEntries(Object.entries(SETTINGS).map(([k, s]) => [k, s.default]));

/* Complete, clamped settings and what was clamped. */
export function normalise(given = {}, { candidates = 3 } = {}) {
  const unknown = Object.keys(given).filter((k) => !SETTINGS[k]);
  if (unknown.length) throw new EngineError(`unknown setting${unknown.length > 1 ? "s" : ""} ${unknown.join(", ")}; valid: ${Object.keys(SETTINGS).join(", ")}`);
  const out = defaults(), clamped = [];
  for (const [k, v] of Object.entries(given)) {
    const s = SETTINGS[k];
    if (s.type === "string") {
      const str = String(v).replace(/\s+/g, "");
      if (k === "strategies") {
        const list = str.split(",").filter(Boolean);
        const bad = list.filter((x) => !STRATEGIES.includes(x));
        if (bad.length || !list.length) throw new EngineError(`strategies: unknown ${bad.join(", ") || "(none given)"}; valid: ${STRATEGIES.join(", ")}`);
        out[k] = STRATEGIES.filter((x) => list.includes(x)).join(",");
      } else {
        if (!s.enum.includes(str)) throw new EngineError(`${k}: ${v} is not one of ${s.enum.join(" | ")}`);
        out[k] = str;
      }
      continue;
    }
    let n = Number(v);
    if (!Number.isFinite(n)) throw new EngineError(`${k}: ${v} is not a number`);
    if (s.type === "integer") n = Math.round(n);
    const c = Math.min(s.max, Math.max(s.min, n));
    if (c !== n) clamped.push({ name: k, given: v, used: c });
    out[k] = c;
  }
  // primaryCandidate cannot point past the colours the logo has.
  const maxPrimary = Math.max(0, candidates - 1);
  if (out.primaryCandidate > maxPrimary) { clamped.push({ name: "primaryCandidate", given: out.primaryCandidate, used: maxPrimary }); out.primaryCandidate = maxPrimary; }
  return { settings: out, clamped };
}
