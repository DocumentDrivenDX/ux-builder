/* Contrast fitting (SD-001 Fitting, US-008).

   Compose the option with every shared design system, resolve, and check
   every PAIRS entry of tools/contrast.mjs, the build gate's own list. For a
   failing pairing, the side that may move is traced back to its brand role:
   the foreground if it is movable, else the background (a filled button
   moves, not the label on it). Grounds and surfaces never move.

   A role that must move goes to the nearest OKLCH lightness, hue and chroma
   kept, at which every pairing it takes part in passes. Repeat until clean,
   at most 8 rounds; a role that cannot pass at any lightness withholds the
   option. */

import { PAIRS, ratio, solid } from "../../../../tools/contrast.mjs";
import { composeOn, resolveAll } from "../../../tokens/compose-core.mjs";
import { oklchToHex } from "../oklch.js";

export const FIXED = new Set(["color.ground", "color.ground-recessed", "color.surface", "color.surface-sunken"]);
const ROUNDS = 8, STEP = 0.005;
const css = (path) => `piq-${path.replace(/\./g, "-")}`;

const brandOf = (hexes) => {
  const groups = { color: {}, state: {}, brand: {} };
  for (const [path, hex] of Object.entries(hexes)) { const [g, k] = path.split("."); groups[g][k] = { $value: hex }; }
  return groups;
};

/* Follow {single.reference} chains to the brand role a token takes its colour from. */
function traceRole(composed, path) {
  for (let i = 0; i < 12 && path; i++) {
    if (/^(color|state)\./.test(path) && /^#/.test(String(composed.get(path)?.value))) return path;
    const m = /^\{([a-z0-9.-]+)\}$/.exec(String(composed.get(path)?.value ?? "").trim());
    path = m?.[1];
  }
  return null;
}

/* Every pairing on every design system: who moves, against what, and whether it passes. */
function survey(hexes, designSystems, appearance, floor) {
  const brand = { name: "generated", appearances: { [appearance]: brandOf(hexes) } };
  const out = [];
  for (const ds of designSystems) {
    const composed = composeOn(brand, ds, appearance);
    const resolved = resolveAll(composed, `generated × ${ds.name} (${appearance})`);
    const byCss = new Map([...resolved].map(([p, v]) => [css(p), { path: p, value: v }]));
    for (const [fg, bg, label] of PAIRS) {
      const f = byCss.get(fg), b = byCss.get(bg);
      const a = solid(f?.value), c = solid(b?.value);
      if (!a || !c) continue;
      const rf = traceRole(composed, f.path), rb = traceRole(composed, b.path);
      let mover = null, partner = null;
      if (rf && !FIXED.has(rf)) { mover = rf; partner = c; }
      else if (rb && !FIXED.has(rb)) { mover = rb; partner = a; }
      out.push({ ds: ds.name, label, ratio: ratio(a, c), pass: ratio(a, c) >= floor, mover, partner });
    }
  }
  return out;
}

/* Nearest lightness at which `role` clears `floor` against every partner. */
function nearestL(target, partners, floor) {
  const ok = (l) => { const hex = oklchToHex({ ...target, l }); return partners.every((p) => ratio(hex, p) >= floor); };
  if (ok(target.l)) return target.l;
  for (let d = STEP; d <= 1 + 1e-9; d += STEP) {
    // Down first, then up, so equal distances resolve the same way every time.
    for (const l of [target.l - d, target.l + d]) if (l >= 0 && l <= 1 && ok(l)) return Math.round(l * 1e4) / 1e4;
  }
  return null;
}

/* Fit one appearance of one option. Returns { hexes, lchs, failures } where
   failures is empty on success. */
export function fitAppearance(roles, designSystems, appearance, floor) {
  const lchs = Object.fromEntries(Object.entries(roles).map(([p, r]) => [p, { ...r.lch }]));
  const hexOf = () => Object.fromEntries(Object.entries(lchs).map(([p, v]) => [p, oklchToHex(v)]));
  let hexes = hexOf();
  for (let round = 0; round < ROUNDS; round++) {
    const s = survey(hexes, designSystems, appearance, floor);
    const failing = s.filter((x) => !x.pass);
    if (!failing.length) return { hexes, lchs, failures: [] };
    const unfixable = failing.filter((x) => !x.mover);
    if (unfixable.length) return { hexes, lchs, failures: unfixable.map((x) => `${x.ds}: ${x.label} (${x.ratio.toFixed(2)}:1) has no movable side`) };
    const movers = [...new Set(failing.map((x) => x.mover))].sort();
    for (const role of movers) {
      const partners = [...new Set(s.filter((x) => x.mover === role).map((x) => x.partner))];
      const l = nearestL(lchs[role], partners, floor);
      if (l === null) return { hexes, lchs, failures: [`${role} cannot clear ${floor}:1 against ${partners.join(", ")} at any lightness with its hue`] };
      lchs[role] = { ...lchs[role], l };
    }
    hexes = hexOf();
  }
  const left = survey(hexes, designSystems, appearance, floor).filter((x) => !x.pass);
  return { hexes, lchs, failures: left.map((x) => `${x.ds}: ${x.label} still ${x.ratio.toFixed(2)}:1 after ${ROUNDS} rounds`) };
}

/* For tests: every pairing's ratio on every design system. */
export const checkAll = (hexes, designSystems, appearance, floor = 4.5) => survey(hexes, designSystems, appearance, floor);
