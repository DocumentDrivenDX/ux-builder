/* ux-builder-design modality (CONTRACT-008 Commands, FEAT-018 GDL-80): the
   person says what kind of experience the app gives (responsive web, chat,
   hybrid chat), the screen sizes it must work at and, for responsive web,
   the app frame (US-162: just the screen, a top bar, navigation across the
   top or at the side), before any wireframe or prototype is drawn. Their answer sets the blueprint's supports and is
   recorded in the design state; `ux-builder-blueprint wireframes` and
   `prototype --explore` refuse in a guided app until it matches the
   blueprint, so a changed blueprint asks again. */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FRAMES, frameFor, FUTURE_MODALITIES, MODALITIES } from "@ux-builder/ui/blueprint/modalities";
import { bpFile, DesignError, writeInApp } from "./app.mjs";
import { readState, writeState } from "./state.mjs";

export const SIZE_CLASSES = ["compact", "medium", "expanded", "large", "extra-large"];
const list = (x) => String(x ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const same = (a, b) => JSON.stringify([...(a ?? [])].sort()) === JSON.stringify([...(b ?? [])].sort());

/* The frame to recommend for the blueprint's destinations, and why. */
export function recommendedFrame(bp) {
  const n = Array.isArray(bp?.destinations) ? bp.destinations.filter((d) => d && typeof d === "object").length : 0;
  const frame = frameFor(n);
  return { frame, why: n <= 1 ? `${n === 1 ? "one destination" : "no destinations"}: nothing to navigate between` : n <= 5 ? `${n} destinations fit across a top bar` : `${n} destinations need a side menu` };
}

/* Whether the person's recorded answer matches the blueprint: { confirmed, modalities, sizeClasses, frame, recommended, recorded }. */
export function modalityStatus(app) {
  let bp = null, state = null;
  try { bp = JSON.parse(readFileSync(join(app, bpFile(app)), "utf8")); } catch { /* no blueprint */ }
  try { state = readState(app); } catch { /* no design state */ }
  const modalities = bp?.supports?.modalities ?? ["responsive-web"], sizeClasses = bp?.supports?.sizeClasses ?? [];
  const recorded = state?.modality ?? null;
  const frame = bp?.supports?.frame ?? null, web = modalities.includes("responsive-web");
  return { confirmed: !!recorded && same(recorded.modalities, modalities) && same(recorded.sizeClasses, sizeClasses) && (!web || (!!frame && recorded.frame === frame)), modalities, sizeClasses, frame, recommended: web ? recommendedFrame(bp) : null, recorded };
}

/* ux-builder-design modality --answer <their words> --modality <list> --size-classes <list> --frame <frame>. */
export function confirmModality(app, { answer, modalities, sizeClasses, frame } = {}) {
  const ms = list(modalities), ss = list(sizeClasses);
  if (!answer?.trim()) throw new DesignError("modality needs --answer: the person's answer, in their words");
  if (!ms.length) throw new DesignError(`modality needs --modality: one or more of ${Object.keys(MODALITIES).join(", ")}`);
  const future = ms.filter((m) => FUTURE_MODALITIES.includes(m));
  if (future.length) throw new DesignError(`${future.join(", ")} ${future.length === 1 ? "is a future modality" : "are future modalities"}; today the app can be ${Object.keys(MODALITIES).join(", ")}`);
  const unknown = ms.filter((m) => !MODALITIES[m]);
  if (unknown.length) throw new DesignError(`unknown modality ${unknown.join(", ")}; use ${Object.keys(MODALITIES).join(", ")}`);
  const badSize = ss.filter((s) => !SIZE_CLASSES.includes(s));
  if (badSize.length) throw new DesignError(`unknown size class ${badSize.join(", ")}; use ${SIZE_CLASSES.join(", ")}`);
  const file = bpFile(app);
  let bp;
  try { bp = JSON.parse(readFileSync(join(app, file), "utf8")); } catch { throw new DesignError(`no ${file}: run ux-builder-design init first`); }
  // Responsive web is drawn in a frame the person chooses (US-162); a chat-only app has none.
  const web = ms.includes("responsive-web");
  if (frame && !FRAMES[frame]) throw new DesignError(`unknown frame "${frame}"; use ${Object.keys(FRAMES).join(", ")}`);
  if (web && !frame) { const r = recommendedFrame(bp); throw new DesignError(`modality needs --frame for responsive-web: the app frame the person chooses, one of ${Object.entries(FRAMES).map(([k, v]) => `${k} (${v})`).join("; ")}. Recommend ${r.frame} (${r.why}); the person decides.`); }
  if (!web && frame) throw new DesignError(`--frame is for responsive-web; ${ms.join(", ")} ${ms.length === 1 ? "is" : "are"} drawn as a conversation`);
  const { frame: _old, ...kept } = bp.supports ?? {};
  bp.supports = { ...kept, modalities: ms, ...(ss.length ? { sizeClasses: ss } : {}), ...(web ? { frame } : {}) };
  writeInApp(app, file, JSON.stringify(bp, null, 2) + "\n");
  const state = readState(app);
  state.modality = { modalities: ms, sizeClasses: bp.supports.sizeClasses ?? [], ...(web ? { frame } : {}), answer: answer.trim(), at: new Date().toISOString() };
  writeState(app, state);
  return { file, ...state.modality };
}
