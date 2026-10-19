/* Options from an analysed logo (US-007, US-008, US-009; SD-001).

   generate(analysis, settings, { designSystems }) runs each strategy for each
   appearance, fits it to the gate, drops options not distinct from an earlier
   one, and tops up to four with chroma variants. Pure and deterministic: the
   same analysis and settings give byte-identical output. */

import { candidateOf } from "../extract/analyse.js";
import { EngineError, oklchToHex, parseHex } from "../oklch.js";
import { fitAppearance } from "./fit.js";
import { brandColours, distinct, spec } from "./palette.js";
import { normalise } from "./settings.js";

export const ENGINE_VERSION = "0.1.0";
export const REVIEW_THRESHOLD = 0.12; // |ΔL| in OKLCH lightness (SD-001 Fitting)
export const MIN_OPTIONS = 4;

const r3 = (x) => Math.round(x * 1000) / 1000;
const signed = (x) => (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(3);

export function buildOption(strategy, analysis, settings, colours, designSystems, label = strategy) {
  const appearances = {}, moves = [], failures = [];
  for (const ap of settings.appearances.split(",")) {
    const roles = spec(strategy, colours, settings, ap);
    const fitted = fitAppearance(roles, designSystems, ap, settings.minContrast);
    if (fitted.failures.length) { failures.push(...fitted.failures.map((f) => `${ap}: ${f}`)); continue; }
    const groups = { color: {}, state: {}, brand: {} };
    for (const [path, hex] of Object.entries(fitted.hexes)) {
      const [g, k] = path.split(".");
      const aim = roles[path].lch, got = fitted.lchs[path];
      const dl = r3(got.l - aim.l);
      let description = `${roles[path].note}. Generated (${strategy}).`;
      if (dl !== 0) {
        const from = oklchToHex(aim), flagged = Math.abs(dl) > REVIEW_THRESHOLD;
        moves.push({ appearance: ap, role: path, from, to: hex, deltaL: dl, flagged });
        description += ` ${from} moved ${signed(dl)} L (OKLCH, hue kept) to clear ${settings.minContrast}:1${flagged ? "; flagged for review" : ""}.`;
      }
      groups[g][k] = { $value: hex, $description: description };
    }
    groups.brand["logo-paint"] = { $value: colours.logoPaint, $description: colours.suggested ? "No brand colour in the logo: suggested colour." : "The logo's top brand colour, as supplied." };
    appearances[ap] = groups;
  }
  if (failures.length) return { label, strategy, withheld: failures };
  return {
    label,
    strategy,
    settings,
    brand: {
      appearances,
      generation: { engine: ENGINE_VERSION, extracted: analysis.candidates.map((c) => c.hex), strategy, settings: { ...settings } },
    },
    moves,
  };
}

export function generate(analysis, given = {}, { designSystems } = {}) {
  if (!analysis?.candidates) throw new EngineError("generate() takes the result of analyse()");
  if (!designSystems?.length) throw new EngineError("generate() needs the shared design systems to fit against");
  const { settings, clamped } = normalise(given, { candidates: analysis.candidates.length });
  const colours = brandColours(analysis, settings);
  const warnings = [...analysis.warnings];
  if (colours.suggested) warnings.push(`no brand colour: options use a suggested colour at hue ${settings.suggestedHue}°`);

  const options = [], withheld = [];
  const take = (o) => {
    if (o.withheld) { withheld.push(o); return; }
    const first = o.brand.appearances.light ?? o.brand.appearances.dark;
    const flat = (b) => Object.fromEntries(Object.entries(b.color).map(([k, v]) => [`color.${k}`, v.$value]));
    const clash = options.find((p) => !distinct(flat(p.brand.appearances.light ?? p.brand.appearances.dark), flat(first)));
    if (clash) { warnings.push(`${o.label}: not distinct from ${clash.label}; dropped`); return; }
    options.push(o);
  };
  for (const strategy of settings.strategies.split(",")) {
    if (strategy === "two-colour" && !colours.secondary) { warnings.push("two-colour: the logo has no second brand colour at least 30° away in hue; skipped"); continue; }
    take(buildOption(strategy, analysis, settings, colours, designSystems));
  }
  // Top up to four with chroma variants (SD-001 Strategies).
  const variants = [["muted", -0.25, "muted-softer"], ["vibrant", 0.25, "vibrant-stronger"], ["faithful", -0.35, "faithful-softer"], ["neutral-accent", 0.3, "neutral-accent-stronger"]];
  const chosen = settings.strategies.split(",");
  for (const [strategy, dc, label] of variants) {
    if (options.length >= MIN_OPTIONS) break;
    if (!chosen.includes(strategy)) continue;
    const s = { ...settings, chromaScale: Math.min(1.5, Math.max(0.5, settings.chromaScale + dc)) };
    take(buildOption(strategy, analysis, s, colours, designSystems, label));
  }
  return { options, withheld, clamped, warnings };
}


/* Rebuild a brand file's palette from its recorded generation block and
   compare every colour (US-009-AC5, FR-12). `analysis` is the logo's, from
   analyse(). The caller checks the logo's hash; this checks the rest. */
export function regenerate(brand, analysis, { designSystems } = {}) {
  const gen = brand?.generation;
  if (!gen) throw new EngineError("this brand file has no generation block: it was not made by the engine");
  const warnings = [];
  const [maj, min] = gen.engine.split(".");
  const [cmaj, cmin] = ENGINE_VERSION.split(".");
  if (maj !== cmaj || min !== cmin) warnings.push(`made by engine ${gen.engine}; this is ${ENGINE_VERSION}, so colours may differ`);
  // The recorded colours, in their recorded order, are what generation used:
  // the builder measures an SVG by drawn area, the command line by markup, and
  // either way the palette must come back the same. (The caller checks the
  // logo's hash, so a changed logo is still caught.)
  if (gen.extracted) {
    analysis = { ...analysis, candidates: gen.extracted.map((hex) => candidateOf(parseHex(hex))), monochrome: gen.extracted.length === 0 };
  }
  const { settings, clamped } = normalise(gen.settings, { candidates: analysis.candidates.length });
  if (clamped.length) warnings.push(`recorded settings were out of range: ${clamped.map((c) => c.name).join(", ")}`);
  const option = buildOption(gen.strategy, analysis, settings, brandColours(analysis, settings), designSystems);
  if (option.withheld) return { identical: false, differences: option.withheld.map((w) => ({ problem: w })), warnings };
  const differences = [];
  for (const ap of new Set([...Object.keys(brand.appearances), ...Object.keys(option.brand.appearances)])) {
    const was = brand.appearances[ap], now = option.brand.appearances[ap];
    if (!was || !now) { differences.push({ appearance: ap, problem: was ? "no longer produced" : "not in the brand file" }); continue; }
    for (const g of ["color", "state", "brand"]) {
      for (const k of new Set([...Object.keys(was[g] ?? {}), ...Object.keys(now[g] ?? {})])) {
        const a = was[g]?.[k]?.$value, b = now[g]?.[k]?.$value;
        // Artwork and other values the engine does not produce (logo-image, logo-height) are not compared.
        if (b === undefined && !/^#[0-9a-f]{6}$/i.test(String(a))) continue;
        if (String(a).toUpperCase() !== String(b).toUpperCase()) differences.push({ appearance: ap, role: `${g}.${k}`, recorded: a ?? null, regenerated: b ?? null });
      }
    }
  }
  return { identical: differences.length === 0, differences, warnings, option };
}
