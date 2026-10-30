/* UX decisions as HELIX ADRs (CONTRACT-008 Commands, FEAT-018 GDL-31,
   ADR-042 decision 2): `decision add` proposes
   docs/helix/02-design/adr/ADR-<nnn>-<slug>.md in HELIX's ADR shape, tagged
   area:ui, with the question, the alternatives, the choice and why, its
   assumptions and a Validation section; `decision status` proposes the
   Validation section's change, keeping the earlier result in its history.
   Both go through the person's approval of HELIX proposals. Adding one also
   writes a decision to the trace. */

import { recordDecision } from "@ux-builder/trace";
import { DesignError } from "./app.mjs";
import { parseDocument } from "./documents.mjs";
import { currentText, helixDocuments, nextNumber, proposeChange, proposedDocuments, requireHelix, sectionOf, setSection, slug } from "./helix.mjs";

export const DECISION_STATUSES = ["not-tested", "tested", "refuted"];
const RESULT = { "not-tested": "not tested", tested: "tested", refuted: "refuted" };
const list = (x) => (Array.isArray(x) ? x : x == null ? [] : [x]).map(String).map((s) => s.trim()).filter(Boolean);
const today = () => new Date().toISOString().slice(0, 10);

/* The Validation section's body. */
function validationBody({ status, evidence, required, history }) {
  return [
    `**Result**: ${RESULT[status]}`,
    `**Evidence**: ${evidence || "none yet"}`,
    `**Required**: ${required || "to be decided"}`,
    ...(history.length ? ["", "**History**:", ...history.map((h) => `- ${RESULT[h.status]} until ${h.until}${h.evidence ? ` (${h.evidence})` : ""}`)] : []),
  ].join("\n");
}

/* The ADR's text from its fields, in HELIX's ADR shape (v0.20.0). */
function render({ id, question, options, choice, why, assumptions, validation, links }) {
  const front = ["---", "ddx:", `  id: ${id}`, "  type: adr", "  status: accepted", "  authoring:", "    home: repo", "  tags:", "    - area:ui", ...(links.length ? ["  links:", ...links.flatMap((to) => ["    - kind: informed_by", `      to: ${to}`])] : []), "---"];
  return [
    ...front, "", `# ${id}: ${question}`, "",
    "## Problem", "", question, "",
    "## Decision", "", `We will ${choice.charAt(0).toLowerCase()}${choice.slice(1)}.`, "",
    "## Why We Chose This", "", ...list(why).map((w) => `- ${w}`), "",
    ...options.filter((o) => o !== choice).flatMap((o) => [`### Over ${o}`, "", `Considered and not chosen, for the reasons above.`, ""]),
    "## Consequences", "", `**Good**: ${list(why)[0]}.`, "", `**Trade-offs**: ${options.filter((o) => o !== choice).join(", ")} ${options.length > 2 ? "are" : "is"} set aside.`, "",
    "## Assumptions", "", ...(assumptions.length ? assumptions.map((a) => `- ${a}`) : ["- None recorded."]), "",
    "## Validation", "", validationBody({ status: "not-tested", required: validation, history: [] }), "",
  ].join("\n");
}

/* ux-builder-design decision add: proposes the ADR. */
export function decisionAdd(app, { question, options, choice, why, assumptions, validation, links } = {}) {
  options = list(options);
  if (!question?.trim()) throw new DesignError("decision add needs --question");
  if (options.length < 2) throw new DesignError(`decision add needs at least two --option alternatives; got ${options.length}`);
  if (!choice?.trim() || !options.includes(choice.trim())) throw new DesignError(`--choice must be one of the options (${options.join(", ")}), not "${choice ?? ""}"`);
  if (!why?.trim()) throw new DesignError("decision add needs --why: the rationale");
  const root = requireHelix(app, "a UX decision");
  const id = `ADR-${String(nextNumber(app, "ADR")).padStart(3, "0")}`;
  const fields = { id, question: question.trim(), options, choice: choice.trim(), why: why.trim(), assumptions: list(assumptions), validation: validation?.trim() ?? "", links: list(links) };
  const path = `${root}/02-design/adr/${id}-${slug(fields.question)}.md`;
  const p = proposeChange(app, path, () => render(fields));
  let trace = null;
  try {
    const e = recordDecision(app, { chose: fields.choice, why: fields.why, considered: options.filter((o) => o !== fields.choice), assumptions: fields.assumptions, validation: fields.validation || undefined, ux: id }, { by: "agent" });
    trace = e ? { episode: e.episode, seq: e.seq } : null;
  } catch (e) { process.emitWarning(`the decision was not written to the trace: ${e.message}`); }
  return { id, path, proposal: p.id, status: "not-tested", trace };
}

/* An ADR by ID, on disk or proposed: its path. */
export function adrPath(app, id) {
  const hit = [...helixDocuments(app), ...proposedDocuments(app)].find((d) => String((d.front ?? parseDocument(d.text).front)?.ddx?.id) === id);
  if (!hit) throw new DesignError(`no decision ${id}: no HELIX document (or pending proposal) has that ID`);
  return hit.path;
}

/* A decision's Validation: { status, evidence, required, history }. */
export function readValidation(text) {
  const v = sectionOf(text, "Validation") ?? "";
  const field = (k) => v.match(new RegExp(`\\*\\*${k}\\*\\*:\\s*(.+)`))?.[1]?.trim() ?? "";
  const status = Object.entries(RESULT).find(([, r]) => r === field("Result"))?.[0] ?? "not-tested";
  const history = [...v.matchAll(/^- (not tested|tested|refuted) until (\S+)(?: \((.+)\))?$/gm)].map((m) => ({ status: Object.entries(RESULT).find(([, r]) => r === m[1])[0], until: m[2], ...(m[3] ? { evidence: m[3] } : {}) }));
  const evidence = field("Evidence");
  return { status, evidence: evidence === "none yet" ? "" : evidence, required: field("Required") === "to be decided" ? "" : field("Required"), history };
}

/* ux-builder-design decision status <ADR-nnn> tested|refuted [--evidence <where>]. */
export function decisionStatus(app, { id, status, evidence } = {}) {
  if (!/^ADR-[0-9]{3,}$/.test(id ?? "")) throw new DesignError(`decision status needs a decision's ADR ID such as ADR-008, not "${id ?? ""}"`);
  if (!["tested", "refuted"].includes(status)) throw new DesignError(`a decision's status becomes tested or refuted, not "${status ?? ""}"`);
  const path = adrPath(app, id);
  const was = readValidation(currentText(app, path).text);
  const date = today();
  const history = [...was.history, { status: was.status, until: date, ...(was.evidence ? { evidence: was.evidence } : {}) }];
  const p = proposeChange(app, path, (t) => setSection(t, "Validation", validationBody({ status, evidence: evidence ? `${evidence} (${date})` : `(${date})`, required: was.required, history })));
  return { id, path, proposal: p.id, status, evidence: evidence ?? null, date, history };
}

/* The UX decisions: every ADR tagged area:ui, on disk or proposed:
   [{ id, path, title, text, status, links, proposed }]. */
export function uiDecisions(app) {
  const onDisk = helixDocuments(app).map((d) => ({ path: d.path, text: currentText(app, d.path).text, proposed: false }));
  return [...onDisk, ...proposedDocuments(app).map((d) => ({ ...d, proposed: true }))].flatMap((d) => {
    const ddx = parseDocument(d.text).front?.ddx;
    if (ddx?.type !== "adr" || !list(ddx.tags).includes("area:ui")) return [];
    const id = String(ddx.id);
    return [{ id, path: d.path, title: d.text.match(/^# (?:ADR-\d+: )?(.+)$/m)?.[1] ?? id, text: d.text, status: readValidation(d.text).status, links: (ddx.links ?? []).map((l) => String(l.to)), proposed: d.proposed }];
  });
}
