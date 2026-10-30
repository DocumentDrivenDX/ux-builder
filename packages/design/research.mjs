/* Research evidence (CONTRACT-008 Commands, FEAT-018 GDL-17 to GDL-19,
   ADR-039, ADR-042 decision 2): each source belongs to a study, a HELIX
   research plan, as a row of its *Sources*: what it is, when, and where the
   owner keeps it, never its own text. The claims and excerpts the synthesis
   draws from it go in the plan's *Findings* (studies.mjs). */

import { existsSync } from "node:fs";
import { isAbsolute, join, relative } from "node:path";
import { DesignError } from "./app.mjs";
import { addSource, excerptsOf, sourcesOf, studies, studyClaims, studyName } from "./studies.mjs";

export const EVIDENCE_KINDS = ["interview", "analytics", "support", "feedback", "survey", "observation"];
export { claimAdd, claimContradict, claimVerify, unverifiedClaims } from "./studies.mjs";
const today = () => new Date().toISOString().slice(0, 10);

/* A source for a study, from a file the owner keeps; insights and transcript add use it too. */
export function writeEvidence(app, { study, file, kind, date = today(), source, title }) {
  const ref = isAbsolute(file) && !relative(app, file).startsWith("..") ? relative(app, file) : file;
  return { ...addSource(app, study, { source: title ?? `${kind} from ${date}`, kind, date, kept: `${source ?? ref}; not copied here` }), file: ref };
}

/* ux-builder-design evidence add <file> --kind <kind> --study <name> [--date] [--source] [--title]. */
export function evidenceAdd(app, { file, kind, study, date, source, title } = {}) {
  if (!file) throw new DesignError("evidence add needs the source file: evidence add <file> --kind <kind> --study <name>");
  if (!EVIDENCE_KINDS.includes(kind)) throw new DesignError(`--kind is one of ${EVIDENCE_KINDS.join(", ")}, not "${kind ?? ""}"`);
  studyName(study);
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new DesignError(`--date is YYYY-MM-DD, not "${date}"`);
  if (!existsSync(isAbsolute(file) ? file : join(app, file)) && !existsSync(file)) throw new DesignError(`no such file: ${file}`);
  return writeEvidence(app, { study, file, kind, date, source, title });
}

/* ux-builder-design evidence list: each study's sources, claims and excerpts. */
export function evidenceList(app) {
  const claims = studyClaims(app);
  return { studies: studies(app).map((s) => ({ study: s.name, path: s.path, proposed: s.proposed, sources: sourcesOf(s.text), claims: claims.filter((c) => c.study === s.name).length, excerpts: excerptsOf(s.text).length })) };
}
