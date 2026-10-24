/* ux-builder-design modality (CONTRACT-008 Commands, FEAT-018 GDL-80): the
   person says what kind of experience the app gives (responsive web, chat,
   hybrid chat) and the screen sizes it must work at, before any wireframe
   or prototype is drawn. Their answer sets the blueprint's supports and is
   recorded in the design state; `ux-builder-blueprint wireframes` and
   `prototype --explore` refuse in a guided app until it matches the
   blueprint, so a changed blueprint asks again. */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FUTURE_MODALITIES, MODALITIES } from "@ux-builder/ui/blueprint/modalities";
import { bpFile, DesignError, writeInApp } from "./app.mjs";
import { readState, writeState } from "./state.mjs";

export const SIZE_CLASSES = ["compact", "medium", "expanded", "large", "extra-large"];
const list = (x) => String(x ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const same = (a, b) => JSON.stringify([...(a ?? [])].sort()) === JSON.stringify([...(b ?? [])].sort());

/* Whether the person's recorded answer matches the blueprint: { confirmed, modalities, sizeClasses, recorded }. */
export function modalityStatus(app) {
  let bp = null, state = null;
  try { bp = JSON.parse(readFileSync(join(app, bpFile(app)), "utf8")); } catch { /* no blueprint */ }
  try { state = readState(app); } catch { /* no design state */ }
  const modalities = bp?.supports?.modalities ?? ["responsive-web"], sizeClasses = bp?.supports?.sizeClasses ?? [];
  const recorded = state?.modality ?? null;
  return { confirmed: !!recorded && same(recorded.modalities, modalities) && same(recorded.sizeClasses, sizeClasses), modalities, sizeClasses, recorded };
}

/* ux-builder-design modality --answer <their words> --modality <list> --size-classes <list>. */
export function confirmModality(app, { answer, modalities, sizeClasses } = {}) {
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
  bp.supports = { ...(bp.supports ?? {}), modalities: ms, ...(ss.length ? { sizeClasses: ss } : {}) };
  writeInApp(app, file, JSON.stringify(bp, null, 2) + "\n");
  const state = readState(app);
  state.modality = { modalities: ms, sizeClasses: bp.supports.sizeClasses ?? [], answer: answer.trim(), at: new Date().toISOString() };
  writeState(app, state);
  return { file, ...state.modality };
}
