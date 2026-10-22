#!/usr/bin/env node
/* ux-builder-learn: learn from builds (FEAT-016 TRC-08 to TRC-11; ADR-035
   rule 6; US-110, US-111).

     node tools/learn.mjs --store <dir> --out <dir> [--beads] [--dry-run]
                          [--threshold-episodes 3] [--threshold-apps 2] [--evals]
     node tools/learn.mjs replay-result --task <task.json> --result <result.json> [--out <file.json>]
     node tools/learn.mjs grade --tasks <dir> --results <dir> [--out <dir>]

   The store is the private learning store (TRC-08): any folder holding
   export bundles (CONTRACT-007), each a `.tgz` (or `.tar.gz`, `.tar`) with
   `bundle.json`, one `<episode>.jsonl` per episode it lists and its
   transcripts, or the same unpacked into a folder. Bundles are found at any
   depth. The tool refuses (exit 1) a store, or an output folder, inside this
   repository: bundles, the report's episode IDs and the evaluation tasks'
   goals are client content, and only aggregated results (the beads) enter
   the repository. It reads the bundles itself (a minimal tar reader over
   node:zlib) and does not depend on @ux-builder/trace.

   Identity and privacy:
   - An app is known only by `A-` and 10 hex of the SHA-256 of its bundle's
     `app.repoHash` (else its name). Its name is never written.
   - Screens appear only as `S-` and 8 hex of a hash of app and screen.
   - Goal text, decision `why`, `considered`, guidance `input` values and
     transcripts are never written to the report or a bead. Transcripts are
     not read at all.
   - Beads name only rule IDs, check kinds, catalogue component names,
     MCP tool names, modalities and counts: no episode ID (its slug comes
     from the goal), app, screen or path.
   - An episode exported twice (in two bundles) counts once: the copy with
     the most events wins.

   The report (`<out>/learn.md`, `<out>/learn.json`) lists each TRC-09
   signal. A signal's cases are grouped by a key; each group gives its
   episodes, apps, a count, and its breakdown by modality and by pattern.
   - Modality: the episode's `created.modalities`, else `start.modalities`,
     else the same app's earliest `created`; else `unknown`.
   - Patterns: catalogue patterns (packages/ui/catalogue.json `patterns`)
     named in the episode's guidance `answer.components` or a decision's
     `chose`. A finding names no pattern, so this is what the agent was
     building with, not where a finding was.
   - Green: a check's first run with status `pass` or `warn` (a warning does
     not block). Attempts to green: that run's `attempt` (its position when
     `attempt` is missing); with no check events of a kind, the outcome's
     `checksToGreen`.

   The signals (key in brackets):
   1. rule-broken-first-check [rule ID]: a rule in a guidance answer's
      `ruleIds` is among the findings of the first run of a check kind
      (lint, blueprint, card, audit) that comes after that guidance. The
      group also gives how many episodes fetched the rule.
   2. attempts-to-green [check kind]: a check that took more than one attempt
      to go green, or never did. The report also tabulates attempts for every
      check, per modality and pattern.
   3. workaround [catalogue component]: a decision with `workaround: true`;
      keyed by the first catalogue component its `chose` names, else
      `(none named)`.
   4. hand-built-ui [lint rule -> component]: a lint run's finding of
      `ux-builder/no-inline-svg` (component Icon) or `ux-builder/no-foreign-ui`
      (the finding's `component` if given, else the SDK's widgets) where the
      catalogue has that component. One case per episode and rule, its count
      the largest any run reported.
   5. assessment-not-audit [rule ID]: an open assessment finding (an
      `outcome.assessment.compare` entry with status new, persistent or
      regressed) whose `rule` the deterministic audit did not report in that
      episode, neither in `outcome.audit.findings` (count > 0) nor in an audit
      check event. The comparison is by rule ID only; an assessment finding
      with no `rule` cannot be compared and is counted under `notes`.
   6. regressed [rule ID, else finding ID]: for one app, episodes in start
      order. A later episode's compare entry with status `regressed`, or
      `new` for a key resolved earlier; or a rule an earlier episode's audit
      reported in a check run but not in its outcome (resolved there) that a
      later episode's audit reports again.
   7. repeated-guidance [tool and catalogue names in its input, else a hash
      of the input]: the same tool with the same input asked for three or
      more times in one episode.

   --beads files one bead per group over the threshold (default: 3 episodes
   across 2 apps) with `ddx bead create` (type task, labels
   feat:FEAT-016,learned), run from the repository root. A bead's
   description carries `Learn key: <signal>/<key>`; a group whose key an
   existing learned bead carries is not filed again. --dry-run prints the
   beads as JSON instead.

   --evals writes `<out>/evals/<episode>.json` for each episode whose `end`
   is `done` (US-111-AC1), and `<out>/evals/index.json`. The starting commit
   is `start.commit` if the episode recorded one, else the `change` event's
   `parent`, else the `parent` of its first commit when commits are given as
   `{ sha, parent }`. CONTRACT-007 v1 names none of these, so an episode
   without one is skipped and listed with the reason.

   A replay result (US-111-AC2) has the outcome's fields:
     { v: 1, task, sdk, agent?, checksToGreen: { <check>: n | null },
       audit: { status?, findings: { <rule or check>: n } },
       assessment: { open: [{ id, rule? }] } | null,
       lint: { findings: [{ ruleId, count }] },   for grade
       components: n, patterns: [name], layoutCss: n }   for grade
   replay-result writes the two side by side, a row per check, audit rule
   and the open assessment count, each marked better, same or worse (fewer
   attempts and fewer findings are better; never green is worst).

   grade (US-111-AC3; US-014-AC4, US-031-AC5) gives each replay:
   - sdkShare = (components - offSdk) / components, where offSdk is the
     larger of the lint count (no-foreign-ui, no-inline-svg,
     no-hard-coded-values) and the audit count (sdk-widgets,
     foreign-components, outside-theme, token-colors, token-fonts,
     token-radii, token-overrides, widget-overrides): both see the same
     components, from source and from the page, so they are not added.
     Capped at the components. US-014-AC4 asks >= 0.9.
   - patternMatch = the share of the task's patterns the replay used;
     US-031-AC5 counts a replay compliant when it is 1, `layoutCss` is 0 (no
     lint rule finds app-written layout CSS yet, so the result supplies the
     count; missing is unknown) and the audit did not fail. The sample passes
     with at least 9 in 10 compliant.

   Exits 0; 1 on a refusal or a problem; 2 on usage. */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const LABELS = "feat:FEAT-016,learned";
const GREEN = new Set(["pass", "warn"]);
const OPEN = new Set(["new", "persistent", "regressed"]);
const HAND_BUILT = { "ux-builder/no-inline-svg": "Icon", "ux-builder/no-foreign-ui": null };
const LINT_OFF_SDK = ["ux-builder/no-foreign-ui", "ux-builder/no-inline-svg", "ux-builder/no-hard-coded-values"];
const AUDIT_OFF_SDK = ["sdk-widgets", "foreign-components", "outside-theme", "token-colors", "token-fonts", "token-radii", "token-overrides", "widget-overrides"];

export const SIGNALS = [
  { id: "rule-broken-first-check", title: "A rule fetched in guidance, then broken in the first check that reports it", suggests: "The rule's statement or guidance" },
  { id: "attempts-to-green", title: "Checks that took more than one attempt to go green", suggests: "Recipes and starter shells" },
  { id: "workaround", title: "Decisions marked as a workaround for a missing component", suggests: "Components" },
  { id: "hand-built-ui", title: "UI built by hand where a catalogue component exists", suggests: "Components" },
  { id: "assessment-not-audit", title: "Assessment findings the deterministic audit did not report", suggests: "Checks to automate" },
  { id: "regressed", title: "Findings resolved in one episode and regressed in a later one", suggests: "Guidance that doesn't stick" },
  { id: "repeated-guidance", title: "The same guidance asked for three or more times in one episode", suggests: "Gaps in AGENTS.md or the skill" },
];

const sha = (s) => createHash("sha256").update(String(s)).digest("hex");
const appIdOf = (app = {}) => `A-${sha(app.repoHash ?? app.name ?? "unknown").slice(0, 10)}`;
const screenIdOf = (app, screen) => `S-${sha(`${app}\0${screen}`).slice(0, 8)}`;
const stable = (v) => (Array.isArray(v) ? `[${v.map(stable).join(",")}]` : v && typeof v === "object" ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(",")}}` : JSON.stringify(v));
const countOf = (f) => (typeof f?.count === "number" ? f.count : 1);
const inc = (o, k, n = 1) => { o[k] = (o[k] ?? 0) + n; return o; };

/* ---------- Reading bundles ---------- */

/* The entries of a tar archive: [{ name, data }] for regular files. Handles
   ustar prefixes, pax `path` records and GNU long names. */
export function untar(buf) {
  const out = [];
  let off = 0, longName = null, paxPath = null;
  const str = (b, s, n) => { const x = b.subarray(s, s + n); const z = x.indexOf(0); return x.subarray(0, z < 0 ? x.length : z).toString("utf8"); };
  while (off + 512 <= buf.length) {
    const h = buf.subarray(off, off + 512);
    if (h.every((b) => b === 0)) break;
    const size = parseInt(str(h, 124, 12).trim() || "0", 8);
    const type = String.fromCharCode(h[156] || 48);
    const prefix = str(h, 257, 6).startsWith("ustar") ? str(h, 345, 155) : "";
    let name = prefix ? `${prefix}/${str(h, 0, 100)}` : str(h, 0, 100);
    const data = buf.subarray(off + 512, off + 512 + size);
    off += 512 + Math.ceil(size / 512) * 512;
    if (type === "L") { longName = str(data, 0, data.length); continue; }
    if (type === "x") { const m = /\d+ path=([^\n]*)\n/.exec(data.toString("utf8")); paxPath = m ? m[1] : null; continue; }
    if (type === "g") continue;
    if (longName) { name = longName; longName = null; }
    if (paxPath) { name = paxPath; paxPath = null; }
    if (type !== "0" && type !== "\0" && type !== "7") continue;
    out.push({ name: name.replace(/^\.\//, ""), data: Buffer.from(data) });
  }
  return out;
}

/* One bundle, as { bundle, files: Map<path, Buffer> }, from an archive or a folder. */
export function readBundle(path) {
  const files = new Map();
  if (statSync(path).isDirectory()) {
    const walk = (dir) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.isFile()) files.set(relative(path, p).split("\\").join("/"), readFileSync(p));
      }
    };
    walk(path);
  } else {
    let buf = readFileSync(path);
    if (buf[0] === 0x1f && buf[1] === 0x8b) buf = gunzipSync(buf);
    for (const e of untar(buf)) if (!basename(e.name).startsWith("._")) files.set(e.name, e.data);
  }
  // An archive may wrap everything in one folder: find bundle.json and read relative to it.
  const top = [...files.keys()].filter((k) => basename(k) === "bundle.json").sort((a, b) => a.length - b.length)[0];
  if (!top) throw new Error(`${basename(path)}: no bundle.json`);
  const base = top.slice(0, -"bundle.json".length);
  const rel = new Map([...files].filter(([k]) => k.startsWith(base)).map(([k, v]) => [k.slice(base.length), v]));
  return { bundle: JSON.parse(rel.get("bundle.json").toString("utf8")), files: rel };
}

const isBundleFile = (n) => /\.(tgz|tar\.gz|tar)$/.test(n);

/* Every bundle path in the store, at any depth. */
export function bundlePaths(store) {
  const out = [];
  const walk = (dir) => {
    if (existsSync(join(dir, "bundle.json"))) { out.push(dir); return; }
    for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (e.name.startsWith(".")) continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile() && isBundleFile(e.name)) out.push(p);
    }
  };
  walk(store);
  return out;
}

/* The episodes in a store: [{ id, app, events, ... }] with the kinds picked out. */
export function loadStore(store) {
  const byKey = new Map();
  const problems = [];
  for (const p of bundlePaths(store)) {
    let b;
    try { b = readBundle(p); } catch (e) { problems.push(`${basename(p)}: ${e.message}`); continue; }
    const app = appIdOf(b.bundle.app);
    for (const id of b.bundle.episodes ?? []) {
      const file = [...b.files.keys()].find((k) => !k.startsWith("transcripts/") && basename(k) === `${id}.jsonl`);
      if (!file) { problems.push(`${basename(p)}: episode ${id} has no .jsonl`); continue; }
      const events = [];
      b.files.get(file).toString("utf8").split("\n").forEach((line, i) => {
        if (!line.trim()) return;
        try { events.push(JSON.parse(line)); } catch { problems.push(`${basename(p)}: ${id} line ${i + 1} is not JSON`); }
      });
      events.sort((x, y) => (x.seq ?? 0) - (y.seq ?? 0));
      const key = `${app}\0${id}`;
      if (!byKey.has(key) || byKey.get(key).events.length < events.length) byKey.set(key, { id, app, sdk: b.bundle.sdk ?? null, events });
    }
  }
  const episodes = [...byKey.values()].map(shape);
  // Modality falls back to the app's earliest `created`.
  const appModalities = new Map();
  for (const e of [...episodes].sort(byStart)) if (e.created?.modalities?.length && !appModalities.has(e.app)) appModalities.set(e.app, e.created.modalities);
  for (const e of episodes) {
    const m = e.created?.modalities ?? e.start?.modalities ?? appModalities.get(e.app) ?? [];
    e.modality = m.length ? [...m].sort().join("+") : "unknown";
  }
  return { episodes: episodes.sort(byStart), problems };
}

const byStart = (a, b) => String(a.startedAt).localeCompare(String(b.startedAt)) || a.id.localeCompare(b.id);

function shape(ep) {
  const of = (k) => ep.events.filter((e) => e.kind === k);
  const first = (k) => of(k)[0] ?? null;
  const last = (k) => of(k).at(-1) ?? null;
  const start = first("start");
  return { ...ep, start, created: first("created"), end: last("end"), outcome: last("outcome"), change: last("change"),
    guidance: of("guidance"), checks: of("check"), decisions: of("decision"), startedAt: start?.at ?? ep.events[0]?.at ?? "" };
}

/* ---------- The catalogue ---------- */

export function loadCatalogue(path = join(ROOT, "packages/ui/catalogue.json")) {
  const c = JSON.parse(readFileSync(path, "utf8"));
  const names = (xs) => (xs ?? []).map((x) => x.name).filter((n) => /^[A-Z]/.test(n));
  const patterns = new Set(names(c.patterns));
  const components = new Set([...names(c.widgets), ...patterns, ...names(c.assistant), ...names(c.adaptiveCards)]);
  return { patterns, components, widgets: new Set(names(c.widgets)) };
}

const namesIn = (text, set) => String(text ?? "").match(/[A-Z][A-Za-z0-9]+/g)?.filter((w) => set.has(w)) ?? [];

function patternsOf(ep, cat) {
  const out = new Set();
  for (const g of ep.guidance) for (const c of g.answer?.components ?? []) if (cat.patterns.has(c)) out.add(c);
  for (const d of ep.decisions) for (const c of namesIn(d.chose, cat.patterns)) out.add(c);
  return [...out].sort();
}

/* ---------- Signals ---------- */

/* The audit's per-rule counts in an outcome, as { rule: n }. Accepts a map or [{ ruleId|rule|check, count }]. */
export function auditCounts(audit) {
  const f = audit?.findings ?? audit?.perRule ?? {};
  const out = {};
  if (Array.isArray(f)) for (const x of f) inc(out, x.ruleId ?? x.rule ?? x.check, countOf(x));
  else for (const [k, v] of Object.entries(f)) out[k] = typeof v === "number" ? v : countOf(v);
  return Object.fromEntries(Object.entries(out).filter(([, n]) => n > 0));
}

const checkRules = (c) => (c.findings ?? []).filter((f) => countOf(f) > 0).map((f) => f.ruleId);
const auditCheckRules = (ep) => new Set(ep.checks.filter((c) => c.check === "audit").flatMap(checkRules));

/* Attempts to green per check kind: { lint: n | null, ... }. */
export function attemptsToGreen(ep) {
  const out = {};
  const kinds = new Map();
  for (const c of ep.checks) { if (!kinds.has(c.check)) kinds.set(c.check, []); kinds.get(c.check).push(c); }
  for (const [k, runs] of kinds) {
    const i = runs.findIndex((r) => GREEN.has(r.status));
    out[k] = i < 0 ? null : runs[i].attempt ?? i + 1;
  }
  for (const [k, n] of Object.entries(ep.outcome?.checksToGreen ?? {})) if (!(k in out)) out[k] = n;
  return out;
}

/* Every case of every signal: [{ signal, key, episode, app, modality, patterns, n, ... }]. */
export function cases(episodes, cat) {
  const out = [];
  const add = (signal, ep, key, extra = {}) => out.push({ signal, key, episode: ep.id, app: ep.app, modality: ep.modality, patterns: ep.patterns, n: 1, ...extra });
  for (const ep of episodes) ep.patterns = patternsOf(ep, cat);

  for (const ep of episodes) {
    // 1. Fetched, then broken in the first run of a check that comes after.
    const firstRuns = new Map();
    for (const c of ep.checks) if (!firstRuns.has(c.check)) firstRuns.set(c.check, c);
    const broken = new Map();
    for (const g of ep.guidance) for (const rule of g.answer?.ruleIds ?? []) {
      for (const c of firstRuns.values()) if (c.seq > g.seq && checkRules(c).includes(rule) && !broken.has(rule)) broken.set(rule, c.check);
    }
    for (const [rule, check] of broken) add("rule-broken-first-check", ep, rule, { check });

    // 2. Attempts to green.
    for (const [check, n] of Object.entries(attemptsToGreen(ep))) if (n === null || n > 1) add("attempts-to-green", ep, check, { attempts: n, n: n ?? 1 });

    // 3. Workarounds.
    for (const d of ep.decisions.filter((x) => x.workaround === true)) {
      add("workaround", ep, namesIn(d.chose, cat.components)[0] ?? "(none named)", d.screen ? { screen: screenIdOf(ep.app, d.screen) } : {});
    }

    // 4. Hand-built UI where the catalogue has the component.
    const hand = new Map();
    for (const c of ep.checks.filter((x) => x.check === "lint")) for (const f of c.findings ?? []) {
      if (!(f.ruleId in HAND_BUILT) || countOf(f) <= 0) continue;
      const component = f.component ?? HAND_BUILT[f.ruleId];
      if (component ? !cat.components.has(component) : !cat.widgets.size) continue;
      const key = `${f.ruleId} -> ${component ?? "the SDK's widgets"}`;
      hand.set(key, Math.max(hand.get(key) ?? 0, countOf(f)));
    }
    for (const [key, n] of hand) add("hand-built-ui", ep, key, { n });

    // 5. Open assessment findings the audit did not report (by rule ID).
    const audited = new Set([...Object.keys(auditCounts(ep.outcome?.audit)), ...auditCheckRules(ep)]);
    const seen = new Set();
    for (const f of ep.outcome?.assessment?.compare ?? []) {
      if (!OPEN.has(f.status) || !f.rule || audited.has(f.rule) || seen.has(f.rule)) continue;
      seen.add(f.rule);
      add("assessment-not-audit", ep, f.rule, { status: f.status });
    }

    // 7. The same guidance asked for three or more times.
    const asked = new Map();
    for (const g of ep.guidance) {
      // Only catalogue names are shown; any other input is hashed, as it may be client text.
      const values = Object.values(g.input ?? {});
      const key = values.every((v) => typeof v === "string" && cat.components.has(v))
        ? `${g.tool}(${values.join(",")})` : `${g.tool}(#${sha(stable(g.input)).slice(0, 8)})`;
      asked.set(key, (asked.get(key) ?? 0) + 1);
    }
    for (const [key, n] of asked) if (n >= 3) add("repeated-guidance", ep, key, { n });
  }

  // 6. Regressions, per app in start order.
  const byApp = new Map();
  for (const ep of episodes) { if (!byApp.has(ep.app)) byApp.set(ep.app, []); byApp.get(ep.app).push(ep); }
  for (const eps of byApp.values()) {
    eps.sort(byStart);
    const resolved = new Map(); // key -> episode it was resolved in
    for (const ep of eps) {
      const found = new Map();
      for (const f of ep.outcome?.assessment?.compare ?? []) {
        const key = f.rule ?? f.id;
        if (f.status === "regressed" || (f.status === "new" && resolved.has(key))) found.set(key, resolved.get(key) ?? null);
      }
      const outcomeAudit = auditCounts(ep.outcome?.audit);
      const reported = new Set([...Object.keys(outcomeAudit), ...auditCheckRules(ep)]);
      for (const rule of reported) if (resolved.has(rule) && !found.has(rule)) found.set(rule, resolved.get(rule));
      for (const [key, from] of found) add("regressed", ep, key, { resolvedIn: from });
      // What this episode resolved, for later ones.
      for (const f of ep.outcome?.assessment?.compare ?? []) if (f.status === "resolved") resolved.set(f.rule ?? f.id, ep.id);
      if (ep.outcome) for (const rule of auditCheckRules(ep)) if (!outcomeAudit[rule]) resolved.set(rule, ep.id);
      for (const key of found.keys()) resolved.delete(key);
    }
  }
  return out;
}

/* Cases grouped by signal and key, with the threshold applied. */
export function groups(all, { episodes = 3, apps = 2 } = {}) {
  return SIGNALS.map((s) => {
    const mine = all.filter((c) => c.signal === s.id);
    const keys = [...new Set(mine.map((c) => c.key))].sort();
    return { ...s, groups: keys.map((key) => {
      const cs = mine.filter((c) => c.key === key);
      const eps = [...new Set(cs.map((c) => `${c.app}/${c.episode}`))];
      const appSet = [...new Set(cs.map((c) => c.app))].sort();
      const byModality = {}, byPattern = {};
      for (const c of cs) { inc(byModality, c.modality); for (const p of c.patterns.length ? c.patterns : ["(no pattern)"]) inc(byPattern, p); }
      return { key, episodes: cs.map((c) => ({ episode: c.episode, app: c.app })).filter((x, i, a) => a.findIndex((y) => y.episode === x.episode && y.app === x.app) === i),
        apps: appSet, count: cs.reduce((n, c) => n + c.n, 0), byModality, byPattern,
        overThreshold: eps.length >= episodes && appSet.length >= apps, cases: cs };
    }) };
  });
}

/* Attempts to green for every check, per modality and pattern. */
export function attemptsTable(episodes) {
  const rows = new Map();
  for (const ep of episodes) for (const [check, n] of Object.entries(attemptsToGreen(ep))) {
    for (const pattern of ep.patterns?.length ? ep.patterns : ["(no pattern)"]) {
      const k = `${check}\0${ep.modality}\0${pattern}`;
      if (!rows.has(k)) rows.set(k, { check, modality: ep.modality, pattern, episodes: 0, green: [], notGreen: 0 });
      const r = rows.get(k);
      r.episodes++;
      if (n === null) r.notGreen++; else r.green.push(n);
    }
  }
  return [...rows.values()].map(({ green, ...r }) => ({ ...r, mean: green.length ? +(green.reduce((a, b) => a + b, 0) / green.length).toFixed(2) : null, max: green.length ? Math.max(...green) : null }))
    .sort((a, b) => a.check.localeCompare(b.check) || a.modality.localeCompare(b.modality) || a.pattern.localeCompare(b.pattern));
}

export function analyse(episodes, cat, thresholds) {
  const all = cases(episodes, cat);
  const signals = groups(all, thresholds);
  const fetched = {};
  for (const ep of episodes) for (const r of new Set(ep.guidance.flatMap((g) => g.answer?.ruleIds ?? []))) inc(fetched, r);
  for (const g of signals.find((s) => s.id === "rule-broken-first-check").groups) g.fetchedIn = fetched[g.key] ?? 0;
  const unruled = episodes.reduce((n, ep) => n + (ep.outcome?.assessment?.compare ?? []).filter((f) => OPEN.has(f.status) && !f.rule).length, 0);
  return {
    v: 1, generatedAt: new Date().toISOString(), thresholds,
    episodes: episodes.length, apps: new Set(episodes.map((e) => e.app)).size,
    signals, attempts: attemptsTable(episodes), notes: { unruledAssessmentFindings: unruled },
  };
}

/* ---------- The report ---------- */

const fmt = (o) => Object.entries(o).map(([k, n]) => `${k} ${n}`).join(", ") || "-";

export function markdown(r) {
  const lines = [`# Learning report`, "", `${r.episodes} episodes from ${r.apps} apps. Threshold for a bead: ${r.thresholds.episodes} episodes across ${r.thresholds.apps} apps.`, "",
    "Apps appear only as hashes; episode IDs are listed as evidence and stay in the private store's output. Generated by `tools/learn.mjs`.", ""];
  for (const s of r.signals) {
    lines.push(`## ${s.title}`, "", `Signal \`${s.id}\`. Suggests changing: ${s.suggests}.`, "");
    if (!s.groups.length) { lines.push("No cases.", ""); continue; }
    lines.push("| Key | Episodes | Apps | Count | By modality | By pattern | Over threshold |", "|---|---|---|---|---|---|---|");
    for (const g of s.groups) lines.push(`| \`${g.key}\`${g.fetchedIn !== undefined ? ` (fetched in ${g.fetchedIn})` : ""} | ${g.episodes.length} | ${g.apps.length} | ${g.count} | ${fmt(g.byModality)} | ${fmt(g.byPattern)} | ${g.overThreshold ? "yes" : "no"} |`);
    lines.push("");
    for (const g of s.groups) lines.push(`- \`${g.key}\`: ${g.episodes.map((e) => `${e.episode} (${e.app})`).join(", ")}`);
    lines.push("");
  }
  lines.push("## Attempts to green, every check", "", "| Check | Modality | Pattern | Episodes | Mean attempts | Max | Never green |", "|---|---|---|---|---|---|---|");
  for (const a of r.attempts) lines.push(`| ${a.check} | ${a.modality} | ${a.pattern} | ${a.episodes} | ${a.mean ?? "-"} | ${a.max ?? "-"} | ${a.notGreen} |`);
  lines.push("", `Open assessment findings with no rule ID (not compared with the audit): ${r.notes.unruledAssessmentFindings}.`, "");
  return lines.join("\n");
}

/* ---------- Beads ---------- */

const LESSONS = {
  "rule-broken-first-check": (g) => `Agents were given rule ${g.key} and still broke it on the first run of the check that reports it, in ${g.episodes.length} of the ${g.fetchedIn} episodes that fetched it. The rule's statement or its guidance is not landing: restate it, or add the example the agent needed.`,
  "attempts-to-green": (g) => `The ${g.key} check needed more than one attempt to go green, or never did, in ${g.episodes.length} episodes. The recipes and starter shells for these modalities and patterns should start agents closer to passing.`,
  "workaround": (g) => `Agents recorded a workaround for a missing component${g.key === "(none named)" ? "" : ` around ${g.key}`} in ${g.episodes.length} episodes. Consider a component, slot or variant that covers the need.`,
  "hand-built-ui": (g) => `Agents built UI by hand that the catalogue already covers (${g.key}) in ${g.episodes.length} episodes, ${g.count} times. Make the catalogue component easier to find from the guidance, or close the gap that led agents past it.`,
  "assessment-not-audit": (g) => `The assessment found ${g.key} in ${g.episodes.length} episodes where the deterministic audit reported nothing for it. Automate a check for it in the audit or lint.`,
  "regressed": (g) => `${g.key} was resolved and later came back, in ${g.episodes.length} episodes. The guidance that fixed it does not stick: make it part of the rule, the recipe or a check.`,
  "repeated-guidance": (g) => `Agents asked ${g.key} three or more times in one episode, in ${g.episodes.length} episodes. Say it in AGENTS.md or the skill, so agents need not ask again.`,
};

export function beads(report) {
  const out = [];
  for (const s of report.signals) for (const g of s.groups.filter((x) => x.overThreshold)) {
    const key = `${s.id}/${g.key}`;
    out.push({
      title: `Learned: ${s.title.toLowerCase().replace(/^a /, "")}: ${g.key}`.slice(0, 160),
      type: "task", labels: LABELS,
      description: [
        `${s.title} (FEAT-016 TRC-09). Suggests changing: ${s.suggests}.`, "",
        `Evidence: ${g.episodes.length} episodes across ${g.apps.length} apps, ${g.count} occurrences.`,
        `By modality: ${fmt(g.byModality)}. By pattern: ${fmt(g.byPattern)}.`, "",
        `Lesson: ${LESSONS[s.id](g)}`, "",
        `Aggregated by tools/learn.mjs from the private learning store; no client content.`,
        `Learn key: ${key}`,
      ].join("\n"),
      key,
    });
  }
  return out;
}

function existingKeys() {
  const r = spawnSync("ddx", ["bead", "list", "--label", "learned", "--json"], { cwd: ROOT, encoding: "utf8" });
  if (r.status !== 0) return new Set();
  return new Set([...r.stdout.matchAll(/Learn key: ([^\\"\n]+)/g)].map((m) => m[1].trim()));
}

function fileBeads(list) {
  const have = existingKeys();
  let failed = 0;
  for (const b of list) {
    if (have.has(b.key)) { console.log(`exists  ${b.key}`); continue; }
    const r = spawnSync("ddx", ["bead", "create", b.title, "--type", b.type, "--labels", b.labels, "--description", b.description], { cwd: ROOT, encoding: "utf8" });
    if (r.status === 0) console.log(`filed   ${b.key}: ${r.stdout.trim()}`);
    else { failed++; console.error(`failed  ${b.key}: ${(r.stderr || r.error?.message || "").trim()}`); }
  }
  return failed;
}

/* ---------- Evaluation tasks ---------- */

export function startCommit(ep) {
  if (ep.start?.commit) return { commit: ep.start.commit, from: "start.commit" };
  if (ep.change?.parent) return { commit: ep.change.parent, from: "change.parent" };
  const c0 = ep.change?.commits?.[0];
  if (c0 && typeof c0 === "object" && c0.parent) return { commit: c0.parent, from: "change.commits[0].parent" };
  return null;
}

export function outcomeOf(ep) {
  return {
    checksToGreen: attemptsToGreen(ep),
    audit: { findings: auditCounts(ep.outcome?.audit) },
    assessment: ep.outcome?.assessment ? { open: (ep.outcome.assessment.compare ?? []).filter((f) => OPEN.has(f.status)).map((f) => ({ id: f.id, ...(f.rule ? { rule: f.rule } : {}) })) } : null,
  };
}

export function evals(episodes, cat) {
  const tasks = [], skipped = [], notFinished = [];
  for (const ep of episodes) {
    if (ep.end?.status !== "done") { notFinished.push({ episode: ep.id, app: ep.app, status: ep.end?.status ?? "open" }); continue; }
    const sc = startCommit(ep);
    if (!sc) { skipped.push({ episode: ep.id, app: ep.app, reason: "no starting commit recorded (start.commit, change.parent)" }); continue; }
    tasks.push({ v: 1, task: ep.id, app: ep.app, trigger: ep.start?.trigger ?? null, goal: ep.start?.goal ?? null,
      startCommit: sc.commit, startCommitFrom: sc.from, modality: ep.modality, sdk: ep.start?.sdk ?? ep.sdk,
      patterns: ep.patterns ?? patternsOf(ep, cat), outcome: outcomeOf(ep) });
  }
  return { tasks, skipped, notFinished };
}

/* ---------- Replay results ---------- */

const worse = (a, b) => (a === b ? "same" : a === null ? "better" : b === null ? "worse" : b < a ? "better" : "worse");

/* The side-by-side comparison of a task's outcome and a replay's result (US-111-AC2). */
export function compareReplay(task, result) {
  const o = task.outcome, rows = [];
  for (const c of [...new Set([...Object.keys(o.checksToGreen ?? {}), ...Object.keys(result.checksToGreen ?? {})])].sort()) {
    const a = o.checksToGreen?.[c] ?? null, b = result.checksToGreen?.[c] ?? null;
    rows.push({ field: `checksToGreen.${c}`, original: a, replay: b, result: worse(a, b) });
  }
  const ra = auditCounts(result.audit);
  for (const rule of [...new Set([...Object.keys(o.audit?.findings ?? {}), ...Object.keys(ra)])].sort()) {
    const a = o.audit?.findings?.[rule] ?? 0, b = ra[rule] ?? 0;
    rows.push({ field: `audit.${rule}`, original: a, replay: b, result: worse(a, b) });
  }
  const oa = o.assessment?.open?.length ?? null, rb = result.assessment ? (result.assessment.open ?? (result.assessment.compare ?? []).filter((f) => OPEN.has(f.status))).length : null;
  rows.push({ field: "assessment.open", original: oa, replay: rb, result: oa === null || rb === null ? "not compared" : worse(oa, rb) });
  const judged = rows.filter((r) => r.result === "better" || r.result === "worse" || r.result === "same");
  const verdict = judged.some((r) => r.result === "worse") ? "worse" : judged.some((r) => r.result === "better") ? "beats" : "matches";
  return { v: 1, task: task.task, modality: task.modality, sdk: { original: task.sdk ?? null, replay: result.sdk ?? null }, agent: result.agent ?? null, rows, verdict };
}

export function compareMarkdown(c) {
  return [`# Replay of ${c.task}`, "", `Modality ${c.modality}. SDK: ${stable(c.sdk.original)} -> ${stable(c.sdk.replay)}. Verdict: **${c.verdict}**.`, "",
    "| Field | Original | Replay | Result |", "|---|---|---|---|",
    ...c.rows.map((r) => `| ${r.field} | ${r.original ?? "never"} | ${r.replay ?? "never"} | ${r.result} |`), ""].join("\n");
}

/* The grade of one replay (US-111-AC3). */
export function gradeOne(task, result) {
  const lint = (result.lint?.findings ?? []).filter((f) => LINT_OFF_SDK.includes(f.ruleId)).reduce((n, f) => n + countOf(f), 0);
  const ac = auditCounts(result.audit);
  const audit = AUDIT_OFF_SDK.reduce((n, k) => n + (ac[k] ?? 0), 0);
  const components = typeof result.components === "number" ? result.components : null;
  const offSdk = components === null ? null : Math.min(components, Math.max(lint, audit));
  const sdkShare = components ? +((components - offSdk) / components).toFixed(3) : null;
  const expected = task?.patterns ?? [], used = new Set(result.patterns ?? []);
  const matched = expected.filter((p) => used.has(p));
  const patternMatch = expected.length ? +(matched.length / expected.length).toFixed(3) : null;
  const layoutCss = typeof result.layoutCss === "number" ? result.layoutCss : null;
  const auditStatus = result.audit?.status ?? null;
  const auditPass = auditStatus === null ? null : auditStatus !== "fail";
  const tri = (...xs) => (xs.some((x) => x === false) ? false : xs.some((x) => x === null) ? null : true);
  return { task: result.task, components, offSdk: { lint, audit, counted: offSdk }, sdkShare, us014: sdkShare === null ? null : sdkShare >= 0.9,
    patterns: { expected, used: [...used].sort(), matched }, patternMatch, layoutCss, auditPass,
    us031: tri(patternMatch === null ? null : patternMatch === 1, layoutCss === null ? null : layoutCss === 0, auditPass) };
}

export function grade(tasks, results) {
  const byId = new Map(tasks.map((t) => [t.task, t]));
  const rows = results.map((r) => ({ ...gradeOne(byId.get(r.task), r), taskKnown: byId.has(r.task) }));
  const shares = rows.map((r) => r.sdkShare).filter((x) => x !== null);
  const n014 = rows.filter((r) => r.us014 === true).length, n031 = rows.filter((r) => r.us031 === true).length;
  return { v: 1, replays: rows.length, rows, summary: {
    meanSdkShare: shares.length ? +(shares.reduce((a, b) => a + b, 0) / shares.length).toFixed(3) : null,
    us014: { compliant: n014, of: rows.length, target: "every replay >= 90% of components on SDK widgets and role tokens" },
    us031: { compliant: n031, of: rows.length, passes: rows.length >= 10 ? n031 / rows.length >= 0.9 : null, target: "at least 9 in 10 on the matching patterns, no app-written layout CSS, audit not failed" },
  } };
}

export function gradeMarkdown(g) {
  const pct = (x) => (x === null ? "-" : `${Math.round(x * 100)}%`), yn = (x) => (x === null ? "unknown" : x ? "yes" : "no");
  return ["# Replay grades", "", `${g.replays} replays. Mean share on SDK widgets and role tokens: ${pct(g.summary.meanSdkShare)}. US-014-AC4: ${g.summary.us014.compliant} of ${g.summary.us014.of}. US-031-AC5: ${g.summary.us031.compliant} of ${g.summary.us031.of}${g.summary.us031.passes === null ? " (fewer than 10 replays)" : g.summary.us031.passes ? " (passes)" : " (fails)"}.`, "",
    "| Task | Components | Off the SDK | SDK share | Patterns matched | Layout CSS | Audit | US-014 | US-031 |", "|---|---|---|---|---|---|---|---|---|",
    ...g.rows.map((r) => `| ${r.task} | ${r.components ?? "-"} | ${r.offSdk.counted ?? "-"} | ${pct(r.sdkShare)} | ${r.patterns.matched.length}/${r.patterns.expected.length} | ${r.layoutCss ?? "-"} | ${r.auditPass === null ? "-" : r.auditPass ? "pass" : "fail"} | ${yn(r.us014)} | ${yn(r.us031)} |`), ""].join("\n");
}

/* ---------- The command ---------- */

/* The repository roots a path must stay out of: this checkout and, for a worktree, the main one. */
function repoRoots() {
  const roots = new Set([realpathSync(ROOT)]);
  const r = spawnSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd: ROOT, encoding: "utf8" });
  if (r.status === 0 && r.stdout.trim()) { const d = dirname(r.stdout.trim()); if (existsSync(d)) roots.add(realpathSync(d)); }
  return [...roots];
}

/* The nearest existing ancestor's real path, joined with the rest. */
function real(p) {
  const abs = resolve(p);
  let head = abs, tail = [];
  while (!existsSync(head)) { tail.unshift(basename(head)); head = dirname(head); }
  return join(realpathSync(head), ...tail);
}

export function insideRepo(p) {
  const rp = real(p);
  return repoRoots().some((root) => { const rel = relative(root, rp); return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel)); });
}

function parse(argv) {
  const opts = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) { opts._.push(a); continue; }
    const k = a.slice(2);
    if (["beads", "evals", "dry-run", "help"].includes(k)) opts[k] = true;
    else opts[k] = argv[++i];
  }
  return opts;
}

const USAGE = "usage: node tools/learn.mjs --store <dir> --out <dir> [--beads [--dry-run]] [--threshold-episodes n] [--threshold-apps n] [--evals]\n       node tools/learn.mjs replay-result --task <task.json> --result <result.json> [--out <file.json>]\n       node tools/learn.mjs grade --tasks <dir> --results <dir> [--out <dir>]";
const fail = (msg, code = 1) => { console.error(msg); return code; };
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const jsonFiles = (d) => readdirSync(d).filter((f) => f.endsWith(".json") && f !== "index.json").sort().map((f) => readJson(join(d, f)));
const write = (p, s) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, s); };
const refuseInside = (p, what) => (insideRepo(p) ? `${what} ${p} is inside this repository: bundles and what is drawn from them are client content and stay in the private store (ADR-035 rule 6, US-110-AC4). Use a folder outside the repository.` : null);

export function main(argv = process.argv.slice(2)) {
  const o = parse(argv);
  if (o.help) { console.log(USAGE); return 0; }
  const cmd = o._[0];

  if (cmd === "replay-result") {
    if (!o.task || !o.result) return fail(USAGE, 2);
    const out = o.out ?? o.result.replace(/\.json$/, "") + ".compare.json";
    const refused = refuseInside(out, "The output");
    if (refused) return fail(refused);
    const c = compareReplay(readJson(o.task), readJson(o.result));
    write(out, JSON.stringify(c, null, 2) + "\n");
    write(out.replace(/\.json$/, "") + ".md", compareMarkdown(c));
    console.log(compareMarkdown(c));
    return 0;
  }

  if (cmd === "grade") {
    if (!o.tasks || !o.results) return fail(USAGE, 2);
    const out = o.out ?? o.results;
    const refused = refuseInside(out, "The output");
    if (refused) return fail(refused);
    const results = jsonFiles(o.results).filter((r) => r.task && !r.rows);
    const g = grade(jsonFiles(o.tasks).filter((t) => t.outcome), results);
    write(join(out, "grade.json"), JSON.stringify(g, null, 2) + "\n");
    write(join(out, "grade.md"), gradeMarkdown(g));
    console.log(gradeMarkdown(g));
    return 0;
  }

  if (cmd !== undefined) return fail(`unknown command ${cmd}\n${USAGE}`, 2);
  if (!o.store || !o.out) return fail(USAGE, 2);
  for (const [p, what] of [[o.store, "The store"], [o.out, "The output"]]) { const refused = refuseInside(p, what); if (refused) return fail(refused); }
  if (!existsSync(o.store) || !statSync(o.store).isDirectory()) return fail(`no such store: ${o.store}`);
  const thresholds = { episodes: Number(o["threshold-episodes"] ?? 3), apps: Number(o["threshold-apps"] ?? 2) };
  if (!(thresholds.episodes >= 1 && thresholds.apps >= 1)) return fail("thresholds must be at least 1", 2);

  const cat = loadCatalogue();
  const { episodes, problems } = loadStore(o.store);
  for (const p of problems) console.error(`warning: ${p}`);
  const report = analyse(episodes, cat, thresholds);
  write(join(o.out, "learn.json"), JSON.stringify(report, null, 2) + "\n");
  write(join(o.out, "learn.md"), markdown(report));
  const found = report.signals.reduce((n, s) => n + s.groups.length, 0);
  console.log(`${report.episodes} episodes from ${report.apps} apps; ${found} signal groups; report in ${join(o.out, "learn.md")}`);

  let code = 0;
  if (o.evals) {
    const e = evals(episodes, cat);
    for (const t of e.tasks) {
      const clash = e.tasks.filter((x) => x.task === t.task).length > 1;
      write(join(o.out, "evals", `${t.task}${clash ? `-${t.app}` : ""}.json`), JSON.stringify(t, null, 2) + "\n");
    }
    write(join(o.out, "evals", "index.json"), JSON.stringify({ v: 1, tasks: e.tasks.map((t) => ({ task: t.task, app: t.app, modality: t.modality, startCommit: t.startCommit })), skipped: e.skipped, notFinished: e.notFinished }, null, 2) + "\n");
    console.log(`${e.tasks.length} evaluation tasks in ${join(o.out, "evals")}; ${e.skipped.length} skipped (no starting commit): ${e.skipped.map((s) => s.episode).join(", ") || "none"}`);
  }
  if (o.beads) {
    const list = beads(report);
    if (o["dry-run"]) console.log(JSON.stringify({ beads: list }, null, 2));
    else if (fileBeads(list)) code = 1;
    if (!list.length) console.log(`No signal is over the threshold (${thresholds.episodes} episodes across ${thresholds.apps} apps).`);
  }
  return code;
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) process.exitCode = main();
