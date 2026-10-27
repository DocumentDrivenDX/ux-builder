/* Research evidence (CONTRACT-008 Commands, FEAT-018 GDL-17 to GDL-19,
   ADR-039): a record per source in docs/ux/evidence/EV-<n>.md, holding
   where the owner keeps it and the masked excerpts the synthesis cites,
   never the source's own text. */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { isAbsolute, join, relative } from "node:path";
import { DesignError, ux, writeInApp } from "./app.mjs";
import { CLAIM_COLUMNS, claimChecks, evidenceClaims, parseDocument } from "./documents.mjs";

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

const cell = (s) => String(s ?? "").replace(/\|/g, "/").replace(/\s+/g, " ").trim() || "–";
const claimRow = (c) => `| ${[c.id, c.claim, c.source, c.basis, c.confidence, c.direction ? "yes" : "no", c.verified ? "yes" : "no", c.contradicting, c.unknown].map(cell).join(" | ")} |`;
const evidencePath = (app, id) => {
  if (!/^EV-[1-9][0-9]*$/.test(id ?? "")) throw new DesignError(`an evidence ID is EV-<n>, not "${id ?? ""}"`);
  const path = `${docsDir(app)}/${id}.md`;
  if (!existsSync(join(app, path))) throw new DesignError(`no ${path}; evidence list shows the records`);
  return path;
};

/* Rewrite a record's ## Claims table with rows, adding the section before
   the synthesis notes when it has none. */
function writeClaims(app, path, rows) {
  const text = readFileSync(join(app, path), "utf8");
  const table = ["## Claims", "", `| ${CLAIM_COLUMNS.join(" | ")} |`, `|${CLAIM_COLUMNS.map(() => "---").join("|")}|`, ...rows.map(claimRow), ""].join("\n");
  const at = text.search(/^## Claims\s*$/m);
  let out;
  if (at >= 0) { const rest = text.slice(at).split("\n"); const end = rest.findIndex((l, k) => k > 0 && l.startsWith("## ")); out = text.slice(0, at) + table + "\n" + (end < 0 ? "" : rest.slice(end).join("\n")); }
  else { const notes = text.search(/^## Synthesis notes\s*$/m); out = notes < 0 ? `${text.trimEnd()}\n\n${table}` : `${text.slice(0, notes)}${table}\n${text.slice(notes)}`; }
  return writeInApp(app, path, out);
}

/* ux-builder-design evidence claim add <EV-n> --text --source --basis observed|inferred
   --confidence high|medium|low [--direction] [--verified] [--contradicts] [--unknown]. */
export function claimAdd(app, { id, text, source, basis, confidence, direction = false, verified = false, contradicts, unknown } = {}) {
  const path = evidencePath(app, id);
  if (!text?.trim()) throw new DesignError("evidence claim add needs --text: the claim, in one sentence");
  const c = { evidence: id, id: "", claim: text.trim(), source: source?.trim() ?? "", basis, confidence, direction: !!direction, verified: !!verified, contradicting: contradicts ?? "", unknown: unknown ?? "" };
  const rows = evidenceClaims(app).filter((x) => x.evidence === id);
  c.id = `C${Math.max(0, ...rows.map((r) => Number(r.id.slice(1)) || 0)) + 1}`;
  const { problems, warnings } = claimChecks(c);
  if (problems.length) throw new DesignError(`not recorded: ${problems.join("; ")}`);
  writeClaims(app, path, [...rows, c]);
  return { evidence: id, id: c.id, path, warnings };
}

/* ux-builder-design evidence claim verify <EV-n> <Cn> [--confidence]: the
   agent checked the claim against its source itself. */
export function claimVerify(app, { id, claim, confidence } = {}) {
  const path = evidencePath(app, id);
  const rows = evidenceClaims(app).filter((x) => x.evidence === id);
  const c = rows.find((r) => r.id === claim);
  if (!c) throw new DesignError(`${id} has no claim ${claim ?? ""}; it has ${rows.map((r) => r.id).join(", ") || "none"}`);
  c.verified = true;
  if (confidence) { if (!["high", "medium", "low"].includes(confidence)) throw new DesignError(`--confidence is high, medium or low, not "${confidence}"`); c.confidence = confidence; }
  writeClaims(app, path, rows);
  return { evidence: id, id: c.id, verified: true, confidence: c.confidence };
}

/* Direction-changing claims not yet checked against their source, and not marked low confidence. */
export const unverifiedClaims = (app) => evidenceClaims(app).filter((c) => claimChecks(c).warnings.length).map((c) => ({ evidence: c.evidence, id: c.id, claim: c.claim, source: c.source }));
