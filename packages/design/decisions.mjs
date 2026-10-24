/* Interaction decision records (CONTRACT-008 Commands, FEAT-018 GDL-31):
   docs/ux/decisions/UXD-<n>.md, the question, the alternatives, the
   choice and why, its assumptions and its validation status, so the reason
   survives later iterations. Adding one also writes a decision to the
   trace; a status change keeps the earlier status in the record's history. */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { stringify as toYaml } from "yaml";
import { recordDecision } from "@ux-builder/trace";
import { DesignError, writeInApp } from "./app.mjs";
import { parseDocument } from "./documents.mjs";

const DIR = "docs/ux/decisions";
export const DECISION_STATUSES = ["not-tested", "tested", "refuted"];
const list = (x) => (Array.isArray(x) ? x : x == null ? [] : [x]).map(String).map((s) => s.trim()).filter(Boolean);
const today = () => new Date().toISOString().slice(0, 10);

function numbers(app) {
  const dir = join(app, DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).map((n) => n.match(/^UXD-([1-9][0-9]*)\.md$/)?.[1]).filter(Boolean).map(Number);
}

/* The record's text from its fields. */
function render({ id, question, options, choice, why, assumptions, validation, status, links, history, validated }) {
  const front = { ux: { id, type: "ux-decision", status, ...(validated ? { validated } : {}), ...(history?.length ? { history } : {}), ...(links.length ? { links: links.map((to) => ({ kind: "informed_by", to })) } : {}) } };
  return `---\n${toYaml(front).trimEnd()}\n---\n\n# ${id}: ${question}\n\n## Question\n\n${question}\n\n## Alternatives\n\n${options.map((o) => `- ${o}`).join("\n")}\n\n## Recommendation\n\n${choice}\n\n## Rationale\n\n${list(why).map((w) => `- ${w}`).join("\n")}\n\n## Assumptions\n\n${assumptions.length ? assumptions.map((a) => `- ${a}`).join("\n") : "- None recorded."}\n\n## Validation\n\n- **Status**: ${status}${validated ? ` (${validated.evidence ? `evidence ${validated.evidence}, ` : ""}${validated.date})` : ""}\n- **Required**: ${validation || "to be decided"}\n`;
}

/* ux-builder-design decision add. */
export function decisionAdd(app, { question, options, choice, why, assumptions, validation, links } = {}) {
  options = list(options);
  if (!question?.trim()) throw new DesignError("decision add needs --question");
  if (options.length < 2) throw new DesignError(`decision add needs at least two --option alternatives; got ${options.length}`);
  if (!choice?.trim() || !options.includes(choice.trim())) throw new DesignError(`--choice must be one of the options (${options.join(", ")}), not "${choice ?? ""}"`);
  if (!why?.trim()) throw new DesignError("decision add needs --why: the rationale");
  const id = `UXD-${Math.max(0, ...numbers(app)) + 1}`;
  const fields = { id, question: question.trim(), options, choice: choice.trim(), why: why.trim(), assumptions: list(assumptions), validation: validation?.trim() ?? "", status: "not-tested", links: list(links) };
  const path = writeInApp(app, `${DIR}/${id}.md`, render(fields));
  let trace = null;
  try {
    const e = recordDecision(app, { chose: fields.choice, why: fields.why, considered: options.filter((o) => o !== fields.choice), assumptions: fields.assumptions, validation: fields.validation || undefined, ux: id }, { by: "agent" });
    trace = e ? { episode: e.episode, seq: e.seq } : null;
  } catch (e) { process.emitWarning(`the decision was not written to the trace: ${e.message}`); }
  return { id, path, status: "not-tested", trace };
}

/* Read a record back into its fields. */
function readRecord(app, id) {
  const path = `${DIR}/${id}.md`;
  if (!existsSync(join(app, path))) throw new DesignError(`no decision ${id} (${path})`);
  const doc = parseDocument(readFileSync(join(app, path), "utf8"));
  const ux = doc.front?.ux ?? {};
  const section = (h) => { const m = doc.body.match(new RegExp(`^## ${h}\\s*\\n([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`, "m")); return m ? m[1].trim() : ""; };
  const bullets = (h) => section(h).split("\n").map((l) => l.match(/^- (.+)$/)?.[1]).filter((x) => x && x !== "None recorded.");
  const required = section("Validation").match(/\*\*Required\*\*: (.+)/)?.[1] ?? "";
  return { path, fields: { id, question: section("Question"), options: bullets("Alternatives"), choice: section("Recommendation"), why: bullets("Rationale"), assumptions: bullets("Assumptions"), validation: required === "to be decided" ? "" : required, status: ux.status, links: (ux.links ?? []).map((l) => l.to), history: ux.history ?? [], validated: ux.validated } };
}

/* ux-builder-design decision status <UXD-n> tested|refuted [--evidence <id>]. */
export function decisionStatus(app, { id, status, evidence } = {}) {
  if (!/^UXD-[1-9][0-9]*$/.test(id ?? "")) throw new DesignError(`decision status needs a decision ID such as UXD-1, not "${id ?? ""}"`);
  if (!["tested", "refuted"].includes(status)) throw new DesignError(`a decision's status becomes tested or refuted, not "${status ?? ""}"`);
  const { path, fields } = readRecord(app, id);
  const date = today();
  const history = [...fields.history, { status: fields.status, until: date, ...(fields.validated?.evidence ? { evidence: fields.validated.evidence } : {}) }];
  const next = { ...fields, status, validated: { status, date, ...(evidence ? { evidence } : {}) }, history };
  writeInApp(app, path, render(next));
  return { id, path, status, evidence: evidence ?? null, date, history };
}
