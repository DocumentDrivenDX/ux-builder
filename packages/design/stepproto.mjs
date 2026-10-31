/* A prototype ends every step (FEAT-018 GDL-84; US-163; ADR-042): the
   step prototype, drawn from the blueprint as it stands, with the defaults
   the person has not chosen yet (modality, size classes, frame, theme,
   appearance) recorded as assumptions instead of refused; and its check
   round: the UI audit over every page and the deterministic heuristics,
   the journey walk requested from step 5. The agent fixes what a round
   finds, checks again (or records that nothing needed fixing), and only
   then shows the prototype and asks the step's decision. */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { checkBlueprint, score } from "@ux-builder/ui/blueprint";
import { writePrototype } from "@ux-builder/ui/blueprint/prototype";
import { informationHierarchy, pageText } from "@ux-builder/audit/assess/heuristics.mjs";
import { bpFile, DesignError, protoDir } from "./app.mjs";
import { checkpoint } from "./checkpoints.mjs";
import { logEvent, personTurn, readEvents } from "./metrics.mjs";
import { modalityStatus, recommendedFrame } from "./modality.mjs";
import { CLOSES, progress, STEPS } from "./process.mjs";
import { readState, writeState } from "./state.mjs";

const list = (x) => (Array.isArray(x) ? x : []);
/* Responsive web's size classes (FEAT-014's matrix asks for large too). */
export const DEFAULT_SIZE_CLASSES = ["compact", "medium", "expanded", "large"];
/* From this step the check also asks for the journey walk in a browser (ADR-042 rule 3). */
export const WALK_FROM = 5;

/* Add or update the agent's assumption about one default; one the person
   confirmed or refuted is left as it is. Returns its ID. */
function assume(state, about, text) {
  const all = list(state.assumptions);
  const had = all.find((a) => a.about === about);
  if (had) {
    if (had.status === "assumed") had.text = text;
    return had.id;
  }
  const id = `A-${Math.max(0, ...all.map((a) => Number(/^A-(\d+)$/.exec(a.id)?.[1] ?? 0))) + 1}`;
  // No brief section: a prototype's default is not part of the intended experience, and step 5 confirms it.
  state.assumptions = [...all, { id, text, status: "assumed", evidence: [], about }];
  return id;
}

/* The blueprint the step prototype is drawn from: the app's, with the
   defaults the person has not chosen filled in, and the assumptions made. */
export function withDefaults(app, bp, state) {
  const m = modalityStatus(app);
  const made = [];
  const supports = { ...(bp.supports ?? {}) };
  if (!list(supports.inputs).length) {
    supports.inputs = ["coarse", "fine"];
    made.push(assume(state, "inputs", "People use touch and a mouse or keyboard: assumed until step 5."));
  }
  if (m.confirmed) return { bp: { ...bp, supports }, made };
  if (!list(supports.modalities).length) {
    supports.modalities = ["responsive-web"];
    made.push(assume(state, "modality", "The app is a responsive web app: assumed for the step prototypes until the person chooses at step 5 (Design the structure)."));
  }
  if (!list(supports.sizeClasses).length) {
    supports.sizeClasses = DEFAULT_SIZE_CLASSES;
    made.push(assume(state, "size-classes", `It must work on phones, tablets, laptops and large desktops (${DEFAULT_SIZE_CLASSES.join(", ")}): assumed until step 5.`));
  }
  if (supports.modalities.includes("responsive-web") && !supports.frame) {
    const r = recommendedFrame(bp);
    supports.frame = r.frame;
    made.push(assume(state, "frame", `The app frame is ${r.frame} (${r.why}): assumed until step 5.`));
  }
  return { bp: { ...bp, supports }, made };
}

/* ux-builder-design prototype --step: draw the current step's prototype. */
export async function stepPrototype(app, { write = writePrototype, now = new Date().toISOString() } = {}) {
  const state = readState(app);
  if (state.mode === "change") throw new DesignError("step prototypes belong to the full loop; change mode shows the change's impact instead (ux-builder-design impact)");
  const where = progress(state);
  if (where.step < 1) throw new DesignError("the baseline comes before step 1: start step 1 (ux-builder-design step 1) before its prototype");
  const n = where.step;
  let bp;
  try { bp = JSON.parse(readFileSync(join(app, bpFile(app)), "utf8")); } catch (e) { throw new DesignError(`${bpFile(app)}: ${e.message}`); }
  // Checked as it will be drawn: a blueprint with no supports yet is not wrong before step 5.
  const { bp: drawn, made } = withDefaults(app, bp, state);
  const errors = checkBlueprint(drawn).filter((f) => f.severity === "error");
  if (errors.length) {
    const e = new DesignError(`${bpFile(app)} has ${errors.length} error${errors.length === 1 ? "" : "s"}: fix ${errors.length === 1 ? "it" : "them"} before the step prototype. Nothing was written.\n${errors.map((f) => `  ${f.rule} ${f.path || "/"}: ${f.message}`).join("\n")}`, errors);
    e.code = 1;
    throw e;
  }
  const theme = state.app?.theme ?? "plain";
  if (!state.app?.theme) made.push(assume(state, "theme", "Prototypes use the plain theme until the person chooses one; a brand theme not yet released never blocks: the agent swaps it in when it is."));
  const appearance = state.appearance?.value ?? "light";
  made.push(assume(state, "appearance", state.appearance ? `Prototypes are ${appearance}: ${state.appearance.reason}` : "Prototypes are light: nothing about the product suggests dark rooms or night use."));
  const dir = `step-${n}`;
  const name = STEPS[n - 1].name;
  const w = await write(drawn, { root: join(app, protoDir(app)), dir, question: `Step ${n} of ${STEPS.length}, ${name}: what we have so far`, theme, appearance });
  const rel = `${protoDir(app)}/${dir}`;
  // Drawn again within the step (after a fix), it keeps its rounds, accepted findings and audited pages.
  const was = state.stepPrototypes?.[n];
  const keep = was && !was.stale ? { rounds: was.rounds, ...(was.accepted ? { accepted: was.accepted } : {}), ...(was.audited ? { audited: was.audited } : {}) } : { rounds: [] };
  state.stepPrototypes = { ...(state.stepPrototypes ?? {}), [n]: { dir: rel, at: now, theme, appearance, pages: list(w.files), assumptions: made, ...keep } };
  writeState(app, state);
  logEvent(app, "step-prototype", { step: n, dir: rel }, now);
  const assumptions = state.assumptions.filter((a) => made.includes(a.id)).map((a) => ({ id: a.id, text: a.text }));
  return { step: n, name, dir: rel, entry: w.entry ? `${rel}/${w.entry}` : `${rel}/index.html`, pages: list(w.files).length, theme, appearance, assumptions,
    next: `Check it before showing it: ux-builder-design prototype --step --check` };
}

export function stepPrototypeText(r) {
  return [`Step ${r.step} prototype: ${r.pages} pages in ${r.dir}/ (${r.theme}, ${r.appearance}).`,
    ...(r.assumptions.length ? ["Drawn on these assumptions:", ...r.assumptions.map((a) => `  ${a.id} ${a.text}`)] : []),
    r.next].join("\n");
}

/* The deterministic heuristics of a step prototype: each screen's content
   in its priority order, each journey in no more moves than its shortest
   path, and the blueprint's own warnings (error paths among them). */
export function heuristics(bp, pageHtml) {
  const out = [];
  const ideal = new Map(Object.entries(pageHtml).filter(([f]) => /^[^.]+\.[a-z-]+\.html$/.test(f)).map(([f, html]) => [f.split(".")[0], html]));
  for (const s of list(bp.screens).filter((x) => x?.id)) {
    if (!list(s.content).length) { out.push({ heuristic: "information-hierarchy", screen: s.id, finding: `${s.title ?? s.id} has no content order: say what it shows, highest priority first (screens[].content)` }); continue; }
    const html = ideal.get(s.id);
    if (!html) continue;
    const r = informationHierarchy(s.content, pageText(html));
    if (!r.ok || r.missing.length) out.push({ heuristic: "information-hierarchy", screen: s.id, finding: r.missing.length ? `${s.title ?? s.id} does not show ${r.missing.join(", ")}` : `${s.title ?? s.id} shows its content out of priority order` });
  }
  for (const j of score(bp)) {
    const steps = list(list(bp.journeys).find((x) => x.id === j.journey)?.steps);
    const moves = steps.slice(1).filter((s, k) => s.screen !== steps[k].screen).length;
    if (j.shortestPath != null && moves > j.shortestPath) out.push({ heuristic: "navigation-complexity", journey: j.journey, finding: `${j.journey} takes ${moves} moves where ${j.shortestPath} would do` });
  }
  for (const f of checkBlueprint(bp).filter((x) => x.severity === "warning")) out.push({ heuristic: /error|exception|recover/.test(`${f.rule} ${f.message}`) ? "error-handling" : "blueprint", rule: f.rule, path: f.path, finding: f.message });
  return out;
}


/* The default audit: serve the prototype's folder on a free local port
   and run the UI audit on every page. { ran, pagesAudited, errors,
   warnings, findings } or { ran: false, reason }. */
export async function auditPrototype({ dir, pages, theme, appearance, blueprint, out }) {
  let served = null;
  try {
    const { audit, serveFolder } = await import("@ux-builder/audit");
    served = await serveFolder(dir);
    const report = await audit({ urls: pages.map((p) => served.url + p), themes: [theme], appearances: [appearance], blueprint, out, ignore: [".proto-bar"] });
    const findings = list(report.findings);
    return { ran: true, pagesAudited: pages.length, errors: findings.filter((f) => f.severity === "error").length, warnings: findings.filter((f) => f.severity === "warning").length, findings: findings.map((f) => ({ severity: f.severity, rule: f.rule?.id ?? f.rule ?? f.check, page: f.url?.replace(served.url, ""), message: f.message })) };
  } catch (e) {
    return { ran: false, pagesAudited: 0, reason: e.message };
  } finally { await served?.stop(); }
}

/* The pages a round audits: each screen's ideal state at every size, and
   its other states at one size (the first the prototype has, compact when
   it is there). Session 2 audited every state at every size: 3 minutes a
   round, two thirds of the session. */
export function auditPages(pages) {
  const parts = (f) => f.replace(/\.html$/, "").split(".");
  const sizes = [...new Set(pages.map((f) => parts(f).at(-1)))];
  const one = sizes.includes("compact") ? "compact" : sizes[0];
  return pages.filter((f) => parts(f).length === 2 || parts(f).at(-1) === one);
}

const hashOf = (t) => createHash("sha256").update(t).digest("hex").slice(0, 12);
const findingId = (...key) => `C-${hashOf(key.join("|")).slice(0, 6)}`;
/* The findings of a round, each with a stable ID: the same finding has the same ID in every round. */
const findingsOf = (entry) => [
  ...list(entry.heuristics).map((h) => ({ id: findingId("heuristic", h.heuristic, h.screen ?? h.journey ?? h.path ?? "", h.finding), kind: h.heuristic, text: h.finding })),
  ...list(entry.audit?.findings).filter((f) => f.severity !== "info").map((f) => ({ id: findingId("audit", f.rule ?? "", f.page ?? "", f.message ?? ""), kind: `audit ${f.rule}`, text: `${f.page}: ${f.message}`, page: f.page })),
];
/* The latest checked round's findings that are neither gone nor accepted: [] when the step can be shown. */
export function openFindings(sp) {
  const last = [...list(sp?.rounds)].reverse().find((r) => !r.nothingToFix);
  if (!last) return null;
  return list(last.findings).filter((f) => !sp.accepted?.[f.id]);
}

/* ux-builder-design prototype --step --check [--accept <id>... --reason <why>]. */
export async function stepCheck(app, { nothingToFix = false, accept = [], reason, audit = auditPrototype, now } = {}) {
  const started = Date.now();
  const state = readState(app);
  const n = progress(state).step;
  const sp = state.stepPrototypes?.[n];
  if (!sp || sp.stale) throw new DesignError(`step ${n} has no ${sp?.stale ? "current " : ""}prototype to check: draw it first (ux-builder-design prototype --step)`);
  // Accepting findings: each one of the latest round, with the reason the person or agent gives.
  if (accept.length) {
    const open = openFindings(sp);
    if (open == null) throw new DesignError("--accept follows a check: run ux-builder-design prototype --step --check first");
    if (!reason?.trim()) throw new DesignError("--accept needs --reason: why each finding stays (for example, \"opened from a scan, by design\")");
    const known = new Set(list(sp.rounds.findLast((r) => !r.nothingToFix)?.findings).map((f) => f.id));
    const unknown = accept.filter((id) => !known.has(id));
    if (unknown.length) throw new DesignError(`not a finding of the latest round: ${unknown.join(", ")}; it has ${[...known].join(", ") || "none"}`);
    sp.accepted = { ...(sp.accepted ?? {}), ...Object.fromEntries(accept.map((id) => [id, { reason: reason.trim(), at: now ?? new Date().toISOString() }])) };
    writeState(app, state);
    const left = openFindings(sp);
    return { step: n, round: sp.rounds.length, accepted: accept, open: left, ready: !left.length, next: nextOf(sp, left) };
  }
  const round = sp.rounds.length + 1;
  let entry;
  if (nothingToFix) {
    const open = openFindings(sp);
    if (open == null) throw new DesignError("--nothing-to-fix follows a check: run ux-builder-design prototype --step --check first");
    if (open.length) throw new DesignError(`the latest round has ${open.length} finding${open.length === 1 ? "" : "s"} neither fixed nor accepted: ${open.map((f) => `${f.id} (${f.kind}: ${f.text})`).join("; ")}. Fix each and check again, or accept it with a reason (--accept <id> --reason "<why>").`);
    entry = { round, at: now ?? new Date().toISOString(), nothingToFix: true };
  } else {
    // The blueprint as the prototype was drawn: the defaults the person has not chosen filled in.
    const { bp } = withDefaults(app, JSON.parse(readFileSync(join(app, bpFile(app)), "utf8")), structuredClone(state));
    const abs = join(app, sp.dir);
    const pages = list(sp.pages);
    const html = Object.fromEntries(pages.map((f) => { try { return [f, readFileSync(join(abs, f), "utf8")]; } catch { return [f, ""]; } }));
    // Only the pages whose content changed since they were last audited; the others keep their findings.
    const subset = auditPages(pages);
    const hashes = Object.fromEntries(subset.map((f) => [f, hashOf(html[f])]));
    const changed = subset.filter((f) => sp.audited?.[f] !== hashes[f]);
    const previous = list(sp.rounds.findLast((r) => r.audit?.ran)?.audit?.findings);
    const a = changed.length ? await audit({ dir: abs, pages: changed, theme: sp.theme ?? "plain", appearance: sp.appearance ?? "light", blueprint: bp, out: join(abs, `audit-${round}`) }) : { ran: true, pagesAudited: 0, errors: 0, warnings: 0, findings: [] };
    const carried = previous.filter((f) => subset.includes(f.page) && !changed.includes(f.page));
    const findings = [...list(a.findings), ...carried];
    const merged = { ...a, findings, errors: findings.filter((f) => f.severity === "error").length, warnings: findings.filter((f) => f.severity === "warning").length };
    if (a.ran) sp.audited = { ...(sp.audited ?? {}), ...Object.fromEntries(changed.map((f) => [f, hashes[f]])) };
    // Stamped when the check ends, with how long it took: the audit is most of a step's time (session 2).
    entry = { round, at: now ?? new Date().toISOString(), seconds: Math.round((Date.now() - started) / 1000), pagesAudited: a.pagesAudited ?? 0, pagesUnchanged: subset.length - changed.length, audit: merged, heuristics: heuristics(bp, html), journeyWalk: n >= WALK_FROM ? "requested" : null };
    entry.findings = findingsOf(entry);
    writeFileSync(join(abs, `check-${round}.json`), JSON.stringify({ step: n, ...entry }, null, 2) + "\n");
  }
  sp.rounds.push(entry);
  writeState(app, state);
  logEvent(app, "step-check", { step: n, round, ...(entry.seconds != null ? { seconds: entry.seconds } : {}) }, entry.at);
  const open = openFindings(sp) ?? [];
  return { step: n, round, ...entry, open, ready: !open.length, next: nextOf(sp, open) };
}

const nextOf = (sp, open) => (open.length
  ? `${open.length} finding${open.length === 1 ? "" : "s"} to fix or accept: fix what you can in the blueprint, draw it again (prototype --step) and check again (--check), only the changed pages are audited; accept the rest with a reason (--check --accept <id> --reason "<why>").`
  : `Show the prototype (${sp.dir}/index.html) with what was found, fixed and accepted, then ask: continue, revise, or shall I finish the rest? (ux-builder-design step decide <choice> --answer "<their words>")`);

export function stepCheckText(r) {
  if (r.accepted) return `Step ${r.step}: accepted ${r.accepted.join(", ")}. ${r.open.length ? `${r.open.length} still open.` : "Nothing open."}\n${r.next}`;
  if (r.nothingToFix) return `Step ${r.step}, round ${r.round}: nothing to fix recorded.\n${r.next}`;
  const a = r.audit ?? {};
  return [`Step ${r.step}, check round ${r.round}: ${r.pagesAudited} page${r.pagesAudited === 1 ? "" : "s"} audited${r.pagesUnchanged ? ` (${r.pagesUnchanged} unchanged, their findings kept)` : ""}${a.ran ? `, ${a.errors} error${a.errors === 1 ? "" : "s"} and ${a.warnings} warning${a.warnings === 1 ? "" : "s"}` : ` (the audit did not run: ${a.reason})`}; ${r.heuristics.length} heuristic finding${r.heuristics.length === 1 ? "" : "s"}.`,
    ...list(r.findings).map((f) => `  ${f.id} ${r.open.some((o) => o.id === f.id) ? "open    " : "accepted"} ${f.kind}: ${f.text}`),
    ...(r.journeyWalk ? ["From step 5 the journeys are walked too: run ux-builder-audit assess on the prototype and fix what it finds."] : []),
    r.next].join("\n");
}

export const CHOICES = ["continue", "revise", "finish"];
/* The core checkpoint a step closes, if any: core-1 at step 3, core-2 at 4, core-3 at 7. */
const closedBy = (n) => ["core-1", "core-2", "core-3"].find((id) => Math.max(...CLOSES[id]) === n) ?? null;

/* ux-builder-design step decide continue|revise|finish --answer <their words>:
   the person's decision on the step's checked prototype (US-163-AC4, AC5). */
export function stepDecide(app, { choice, answer, sameTurn = false, now = new Date().toISOString() } = {}) {
  if (!CHOICES.includes(choice)) throw new DesignError(`step decide takes ${CHOICES.join(", ")}, not "${choice ?? ""}"`);
  if (!answer?.trim()) throw new DesignError("step decide needs --answer: the person's decision, in their words");
  let state = readState(app);
  if (state.mode === "change") throw new DesignError("change mode has no step prototypes: use ux-builder-design step next");
  const n = progress(state).step;
  const sp = state.stepPrototypes?.[n];
  const open = sp && !sp.stale ? openFindings(sp) : null;
  const missing = !sp || sp.stale ? `a prototype of step ${n} (ux-builder-design prototype --step)`
    : open == null ? "its check (ux-builder-design prototype --step --check)"
    : open.length ? `each finding of its check fixed (gone on the next check) or accepted with a reason: ${open.map((f) => `${f.id} (${f.kind})`).join(", ")}`
    : null;
  if (missing) throw new DesignError(`step ${n} cannot be decided yet: it needs ${missing}, and the person must have seen it. Nothing was recorded.`);
  let answered = null;
  const firstTry = !readEvents(app).some((e) => e.type === "milestone" && e.name === "prototype");
  if (choice === "continue") {
    // The checkpoint that closes this step is answered by the same decision; its refusals stand,
    // and then nothing is recorded. It records the person's turn.
    const id = closedBy(n);
    if (id && !state.checkpoints.some((c) => c.id === id && ["passed", "skipped"].includes(c.status))) {
      checkpoint(app, { id, answer, sameTurn, now });
      answered = id;
    }
    state = readState(app);
  }
  const turn = answered ? readEvents(app).filter((e) => e.type === "turn").at(-1)?.turn : personTurn(app, { kind: "decision", answer, sameTurn, at: now });
  // The first decision on a shown step prototype is when the person first tried a prototype.
  if (firstTry) logEvent(app, "milestone", { name: "prototype", step: n }, now);
  const entry = state.stepPrototypes[n];
  entry.decision = { choice, answer: answer.trim(), at: now, turn };
  if (choice === "revise") { entry.stale = true; state.next = `Revise step ${n} with the person, then draw and check its prototype again.`; }
  if (choice === "finish") state.next = "Draft what the remaining steps would produce, then run ux-builder-design finish.";
  let moved = false;
  if (choice === "continue" && n < STEPS.length) {
    // To the next step exactly: a checkpoint that already moved the loop is not moved past again.
    state.step = n + 1;
    state.activity = STEPS[n].activity;
    state.next = `Step ${n + 1} of ${STEPS.length}, ${STEPS[n].name}: do its work with the person, then draw and check its prototype (ux-builder-design prototype --step) and ask continue, revise or finish.`;
    moved = true;
  }
  writeState(app, state);
  const logged = readEvents(app).filter((e) => e.type === "step").at(-1);
  if (moved && !(logged?.step === state.step && logged.at === now)) logEvent(app, "step", { step: state.step, mode: state.mode }, now);
  const where = progress(state);
  return { step: n, choice, answer: answer.trim(), ...(answered ? { checkpoint: answered } : {}), now: where.text,
    next: choice === "continue" ? (n < STEPS.length ? `${where.text}. Tell the person what it will ask of them.` : "The last step is done.")
      : choice === "revise" ? `Step ${n} stays: rework it with the person, then draw and check a new prototype (prototype --step, --check).`
      : "Draft what the remaining steps would produce, then run: ux-builder-design finish --answer \"<their words>\"" };
}

export const stepDecideText = (r) => `${r.choice === "continue" ? `Continuing${r.checkpoint ? ` (checkpoint ${r.checkpoint} answered)` : ""}` : r.choice === "revise" ? "Revising" : "Finishing"}: recorded. ${r.next}`;
