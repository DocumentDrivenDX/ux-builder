/* Research evidence (CONTRACT-008 Commands, FEAT-018 GDL-17 to GDL-19,
   ADR-039): a record per source in docs/ux/evidence/EV-<n>.md, holding
   where the owner keeps it and the masked excerpts the synthesis cites,
   never the source's own text. */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { isAbsolute, join, relative } from "node:path";
import { DesignError, ux, writeInApp } from "./app.mjs";
import { parseDocument } from "./documents.mjs";

export const EVIDENCE_KINDS = ["interview", "analytics", "support", "feedback", "survey", "observation"];
const docsDir = (app) => ux(app, "evidence");

/* The EV- numbers in use. */
function numbers(app) {
  const dir = join(app, docsDir(app));
  if (!existsSync(dir)) return [];
  return readdirSync(dir).map((n) => n.match(/^EV-([1-9][0-9]*)\.md$/)?.[1]).filter(Boolean).map(Number);
}

const today = () => new Date().toISOString().slice(0, 10);
const quote = (s) => JSON.stringify(String(s));

/* A new evidence record; kind transcript is written by transcriptAdd, and insights writes analytics, support and feedback. */
export function writeEvidence(app, { file, kind, date = today(), source, title, extra = [], excerpts = [], participants = {} }) {
  const n = Math.max(0, ...numbers(app)) + 1;
  const id = `EV-${n}`;
  const ref = isAbsolute(file) && !relative(app, file).startsWith("..") ? relative(app, file) : file;
  const lines = ["---", "ux:", `  id: ${id}`, "  type: research-evidence", `  kind: ${kind}`, `  date: ${date}`, `  source: ${quote(source ?? ref)}`, `  file: ${quote(ref)}`, ...extra];
  const ps = Object.entries(participants);
  lines.push(ps.length ? "  participants:" : "  participants: {}", ...ps.map(([p, role]) => `    ${p}: ${quote(role)}`));
  lines.push("---", "", `# ${id}: ${title ?? `${kind} from ${date}`}`, "", "## Source", "", `- **Kind**: ${kind}`, `- **Where it is kept**: ${source ?? ref}; not copied here`, `- **File**: \`${ref}\``, "", "## Excerpts", "");
  lines.push(...(excerpts.length ? excerpts.map((e) => `- ${e}`) : ["- None cited yet. Quote only what the synthesis relies on, by pseudonym (P1: \"…\"), masked."]));
  lines.push("", "## Synthesis notes", "", "- None yet.", "");
  const path = writeInApp(app, `${docsDir(app)}/${id}.md`, lines.join("\n"));
  return { id, path, kind, date, source: source ?? ref, file: ref };
}

/* ux-builder-design evidence add <file> --kind <kind> [--date] [--source]. */
export function evidenceAdd(app, { file, kind, date, source, title } = {}) {
  if (!file) throw new DesignError("evidence add needs the source file: evidence add <file> --kind <kind>");
  if (!EVIDENCE_KINDS.includes(kind)) throw new DesignError(`--kind is one of ${EVIDENCE_KINDS.join(", ")}, not "${kind ?? ""}"`);
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new DesignError(`--date is YYYY-MM-DD, not "${date}"`);
  if (!existsSync(isAbsolute(file) ? file : join(app, file)) && !existsSync(file)) throw new DesignError(`no such file: ${file}`);
  return writeEvidence(app, { file, kind, date, source, title });
}

/* ux-builder-design evidence list: each record's ID, kind, date, source and excerpt count. */
export function evidenceList(app) {
  const dir = join(app, docsDir(app));
  const ids = numbers(app).sort((a, b) => a - b);
  const evidence = ids.map((n) => {
    const doc = parseDocument(readFileSync(join(dir, `EV-${n}.md`), "utf8"));
    const ux = doc.front?.ux ?? {};
    const section = doc.body.split(/^## /m).find((s) => s.startsWith("Excerpts")) ?? "";
    const excerpts = section.split("\n").filter((l) => /^\s*-\s*P[0-9]+:/.test(l)).length;
    return { id: `EV-${n}`, kind: ux.kind ?? null, date: ux.date != null ? String(ux.date) : null, source: ux.source ?? null, excerpts, path: `${docsDir(app)}/EV-${n}.md` };
  });
  return { evidence };
}
