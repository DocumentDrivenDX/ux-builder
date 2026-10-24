/* ux-builder-audit assess <subcommand>: the assessment's deterministic
   operations (FEAT-009; CONTRACT-006 "Command"). The coding agent, guided by
   the ux-builder-assess skill, does the reasoning around them.

     init        propose ux-assessment.yml from the repository
     validate    check the manifest against its schema, the repository and HELIX
     collect     map the HELIX documents and criteria to the journeys and tests
     baseline    run the app's tests and the audit before any change
     plan        the journey-and-state plan and the starting coverage matrix
     browser     start Chromium with a CDP endpoint for the agent's driver
     reset       run a fixture's reset between scenarios
     merge       merge findings of one user problem; give each a stable ID
     inspect     inspect a checkpoint: the agent's page in place, or a replay
     heuristics  the heuristic inspection pass: one entry per walked screen and heuristic
     hierarchy   is a page's content in the blueprint's priority order?
     metrics     agent-measured task metrics per walked journey (metrics.json)
     validate-report  check a run package before handing it over
     propose     propose a change to a HELIX artifact for a finding (a patch; nothing applied)
     check-writes  list files under the HELIX root or the app changed during the run
     apply-check   check a proposal's target is unchanged before it is applied
     report      write report.html, report.md and evidence.json
     compare     classify findings across two runs of one scope
     gate        CI exit: fail on open findings at a priority, or a blocked stage
     video       replay the walked journeys as annotated walkthrough videos

   Exit codes: 0 done; 1 the stage could not complete (reported); 2 usage. */

import { parseArgs } from "node:util";

const USAGE = `Usage: ux-builder-audit assess <subcommand> [options]

  init [--out ux-assessment.yml]
      Propose a manifest from the repository's HELIX marker, package.json and
      Playwright configuration. Refuses to overwrite.
  validate [--manifest ux-assessment.yml]
      Check the manifest; print each problem with its path.
  collect [--manifest f] [--run R-id] [--out dir]
      Write requirements.json, traceability.json and run.json for the run.
  baseline [--manifest f] [--run R-id] [--out dir]
      Run the declared tests and the audit (serving the app with run.start);
      write baseline.json, the audit report and the masked test logs.
  plan [--manifest f] [--run R-id] [--agent name] [--model id]
      Write plan.json and the starting coverage.json (after collect).
  merge [--manifest f] [--run R-id]
      Merge backlog.json's findings of one problem, keeping every evidence reference.
  reset --fixture id [--manifest f]
      Run the fixture's reset command.
  browser [--port n] [--headed] [--manifest f] [--run R-id]
      Start Chromium with a CDP endpoint and print it; connect the agent's
      browser driver to it (Playwright MCP: --cdp-endpoint <url>). Ctrl-C stops it.
      With the manifest, only run.origins resolve and excluded integrations do
      not; with --run as well, it stops when limits.runMinutes are spent.
  inspect (--cdp <url> --page <url-match> | --replay <steps.json>) --checkpoint <C-id>
          [--journey <J-id>] [--step n] [--role id] [--state class]
          [--scenario normal|errorProne|risky] [--high-impact-step n]
          [--state-affecting] [--redact <selector>]... [--manifest f] [--out dir] [--run R-id]
      Inspect the page in place (or a verified replay) and write
      <out>/<run>/checkpoints/<id>/inspection.json, screenshot.png, tree.yml.
      With the manifest: its origins, excluded integrations, denied and
      allowed actions, evidence.capture and limits apply. An approve control
      (data-piq-ai-control="approve") is never activated. --scenario risky:
      a replay stops at the approval, records it, chooses Deny and takes
      nothing more; with no approval before the high-impact step (--high-impact-step,
      a step marked highImpact, or the journey's scenarios.risky.step) it stops
      before that step. --scenario errorProne records whether the error is
      shown in place and whether recovery needs no restart.
  heuristics <run-dir> [--blueprint f]
          [--screen id --heuristic id (--finding F-id | --no-finding)]
      Start (or extend) heuristics.json: an entry for every walked screen and
      every heuristic of the pass (Nielsen's ten, error prevention and
      recovery, information hierarchy, navigation complexity). With --screen
      and --heuristic, record one result. Screens no step reached are listed
      as not inspected.
  hierarchy (--page <file.html|tree.yml>) [--screen id] [--blueprint f]
      Check the page's content against the screen's screens[].content, highest
      priority first; the screen is the page's data-piq-screen unless given.
      Exit 1 names the first content out of order.
  metrics <run-dir> [--blueprint f]
      Write metrics.json: per walked journey, completion, interactions, moves
      against the blueprint's shortest path, the path taken, backtracks,
      failed actions, information not found, interface errors and time per
      step, every one agent-measured.
  validate-report <run-dir>
      Check every record in a run package, that its evidence resolves, that
      findings relying on a conflicting HELIX ID are qualified, and that every
      finding names the rule or the heuristic it breaks.

  propose --run R-id --finding F-id (--target <HELIX ID> | --new <type> [--title t])
          --kind new-requirement|unmet-criterion|scope --criterion "Given…" --test "…" [--test-file f] [--keeps text]
      Write a patch in proposals/ for one finding, and the backlog proposed as
      the app's improvement-backlog entry; nothing is applied.
  check-writes --run R-id
      List files under the HELIX root or the app that changed during the run.
  apply-check (P-n | improvement-backlog) --run R-id
      Check a proposal's target is unchanged since the proposal was written.
  report <run-dir> [--self-contained]
      Write report.html, report.md and evidence.json, by journey, state and step,
      each finding with its rule (or heuristic), evidence, severity 0 to 4 and fix;
      report.md is a HELIX usability-evaluation-report. --self-contained embeds
      the screenshots.
  compare <earlier-run-dir> <later-run-dir>
      Classify findings: new, persistent, resolved, regressed, not rechecked;
      and list the earlier baseline's failures.
  gate <run-dir> [--fail-on P0|P1|P2|P3]
      For CI: exit 1 on an open finding at that priority or above, or a blocked stage.
  video --run R-id [--journey J-id]... [--viewport WxH]... [--pace slow|normal|fast] [--manifest f] [--out dir]
      Replay each walked journey (walkthrough.json's do steps) in a browser of
      its own, signed in as its role, masked as evidence.redact says, holding at
      each checkpoint's findings; write <out>/<run>/video/: a clean recording,
      its annotation timeline and captions per journey, and video.json. At the
      normal pace a step holds 2 s and a finding's caption (its problem, rule
      and fix) max(5 s, its words at 200 a minute); slow is 1.5 times as long,
      fast 0.6 times, never under 1 s a step or 3 s a finding.

The ux-builder-assess skill (node_modules/@ux-builder/audit/skill/) says how
an agent runs these as one assessment.`;

const SUB = {
  async heuristics(args) {
    const { values: o, positionals: [dir] } = parseArgs({ args, allowPositionals: true, options: { blueprint: { type: "string" }, screen: { type: "string" }, heuristic: { type: "string" }, finding: { type: "string" }, "no-finding": { type: "boolean" } } });
    if (!dir) { console.error(USAGE); return 2; }
    const { recordResult, runBlueprint, startPass } = await import("./heuristics.mjs");
    try {
      if (o.screen || o.heuristic) {
        if (!o.screen || !o.heuristic || !!o.finding === !!o["no-finding"]) { console.error("record a result with --screen, --heuristic and one of --finding F-id or --no-finding"); return 2; }
        const e = recordResult(dir, { screen: o.screen, heuristic: o.heuristic, finding: o.finding ?? null });
        console.log(`${e.screen} × ${e.heuristic}: ${e.finding ?? e.checked}`);
        return 0;
      }
      const r = startPass(dir, { blueprint: runBlueprint(dir, o.blueprint) });
      const open = r.entries.filter((e) => !e.finding && !e.checked).length;
      console.log(`${dir}/heuristics.json: ${r.screens.length} walked screen${r.screens.length === 1 ? "" : "s"} × ${r.heuristics.length} heuristics; ${open} to record${r.notInspected.length ? `; not inspected: ${r.notInspected.join(", ")}` : ""}`);
      return 0;
    } catch (e) { console.error(e.message); return e.code === "usage" ? 2 : 1; }
  },
  async hierarchy(args) {
    const { values: o } = parseArgs({ args, options: { page: { type: "string" }, screen: { type: "string" }, blueprint: { type: "string", default: "app.blueprint.json" }, json: { type: "boolean" } } });
    const { existsSync, readFileSync } = await import("node:fs");
    if (!o.page) { console.error(USAGE); return 2; }
    for (const f of [o.page, o.blueprint]) if (!existsSync(f)) { console.error(`${f} does not exist`); return 2; }
    const { informationHierarchy, pageScreenOf, pageText } = await import("./heuristics.mjs");
    const text = readFileSync(o.page, "utf8");
    const screen = o.screen ?? pageScreenOf(text);
    const s = (JSON.parse(readFileSync(o.blueprint, "utf8")).screens ?? []).find((x) => x?.id === screen);
    if (!s) { console.error(screen ? `${screen} is not a screen of ${o.blueprint}` : `${o.page} names no screen (data-piq-screen); give --screen`); return 2; }
    if (!(s.content ?? []).length) { console.error(`${screen} declares no content (screens[].content): nothing to check`); return 2; }
    const r = { screen, ...informationHierarchy(s.content, pageText(text)) };
    if (o.json) console.log(JSON.stringify(r, null, 2));
    else {
      console.log(r.ok ? `${screen}: content in priority order (${r.shown.join(", ") || "none shown"})` : `${screen}: ${r.finding.message}`);
      if (r.missing.length) console.log(`not found on the page: ${r.missing.join(", ")}`);
    }
    return r.ok ? 0 : 1;
  },
  async metrics(args) {
    const { values: o, positionals: [dir] } = parseArgs({ args, allowPositionals: true, options: { blueprint: { type: "string" } } });
    if (!dir) { console.error(USAGE); return 2; }
    const { metrics } = await import("./metrics.mjs");
    try {
      const m = metrics(dir, { blueprint: o.blueprint });
      for (const j of m.journeys) console.log(`${j.journey}: ${j.completed ? "completed" : `stopped at step ${j.stoppedAt?.n}`}, ${j.moves} moves (shortest ${j.shortestPath ?? "unknown"}), ${j.backtracks} backtracks, ${j.failedActions} failed actions — agent-measured`);
      console.log(`Wrote ${dir}/metrics.json. ${m.note}`);
      return 0;
    } catch (e) { console.error(e.message); return e.code === "usage" ? 2 : 1; }
  },
  async video(args) {
    const { values: o } = parseArgs({ args, options: { manifest: { type: "string", default: "ux-assessment.yml" }, run: { type: "string" }, out: { type: "string" }, journey: { type: "string", multiple: true }, viewport: { type: "string", multiple: true }, pace: { type: "string", default: "normal" } } });
    const viewports = (o.viewport ?? []).map((v) => { const m = /^(\d+)x(\d+)$/.exec(v); return m && { width: Number(m[1]), height: Number(m[2]) }; });
    if (!["slow", "normal", "fast"].includes(o.pace)) { console.error(`--pace is slow, normal or fast\n${USAGE}`); return 2; }
    if (!o.run || viewports.some((v) => !v)) { console.error(USAGE); return 2; }
    const ready = await validated(o.manifest);
    if (typeof ready === "number") return ready;
    const { video } = await import("./video.mjs");
    const r = await video({ ...ready, out: o.out, run: o.run, journeys: o.journey ?? [], viewports, pace: o.pace });
    if (r.error) { console.error(r.error); return r.code; }
    for (const v of r.record.videos) console.log(`${v.journey} ${v.viewport.width}×${v.viewport.height}: ${v.chapters.filter((c) => c.kind === "main" || c.kind === "alternate").length} chapter(s), ${v.findings.length} finding(s) shown → video/${v.files.clean}`);
    for (const n of r.record.notRecorded) console.error(`${n.journey}: not recorded — ${n.reason}`);
    if (r.stage.status !== "completed") console.error(`video ${r.stage.status}: ${r.stage.reason}`);
    console.log(`Wrote ${r.dir}/video/video.json`);
    return r.code;
  },
  async propose(args) {
    const { values: o } = parseArgs({ args, options: { manifest: { type: "string", default: "ux-assessment.yml" }, run: { type: "string" }, out: { type: "string" }, finding: { type: "string" }, target: { type: "string" }, new: { type: "string" }, kind: { type: "string", default: "new-requirement" }, criterion: { type: "string" }, test: { type: "string" }, "test-file": { type: "string" }, keeps: { type: "string" }, title: { type: "string" } } });
    if (!o.run || !o.finding || !(o.target || o.new) || !o.criterion || !o.test || !["new-requirement", "unmet-criterion", "scope"].includes(o.kind)) { console.error(USAGE); return 2; }
    const ready = await validated(o.manifest);
    if (typeof ready === "number") return ready;
    const { propose } = await import("./proposals.mjs");
    try {
      const { proposal } = propose({ ...ready, out: o.out, run: o.run, finding: o.finding, target: o.target, newType: o.new, kind: o.kind, criterion: o.criterion, test: o.test, testFile: o["test-file"], keeps: o.keeps, title: o.title });
      console.log(`${proposal.id}: ${proposal.target.kind === "new" ? `new ${proposal.target.type} ${proposal.target.id}` : proposal.target.id} (${proposal.target.path}); patch ${proposal.patch}. Nothing was applied.`);
      return 0;
    } catch (e) { console.error(e.message); return e.code === "missing" ? 1 : 2; }
  },
  async "check-writes"(args) {
    const { values: o } = parseArgs({ args, options: { manifest: { type: "string", default: "ux-assessment.yml" }, run: { type: "string" }, out: { type: "string" } } });
    if (!o.run) { console.error(USAGE); return 2; }
    const ready = await validated(o.manifest);
    if (typeof ready === "number") return ready;
    const { checkWrites } = await import("./proposals.mjs");
    const changed = checkWrites({ ...ready, out: o.out, run: o.run });
    for (const p of changed) console.log(`changed: ${p}`);
    console.log(changed.length ? `${changed.length} file(s) under the HELIX root or the app changed during the run` : "no file under the HELIX root or the app changed during the run");
    return changed.length ? 1 : 0;
  },
  async "apply-check"(args) {
    const { values: o, positionals: [proposal] } = parseArgs({ args, allowPositionals: true, options: { manifest: { type: "string", default: "ux-assessment.yml" }, run: { type: "string" }, out: { type: "string" } } });
    if (!o.run || !proposal) { console.error(USAGE); return 2; }
    const ready = await validated(o.manifest);
    if (typeof ready === "number") return ready;
    const { applyCheck } = await import("./proposals.mjs");
    const r = applyCheck({ ...ready, out: o.out, run: o.run, proposal });
    console.log(r.message);
    return r.ok ? 0 : 1;
  },
  async report(args) {
    const { values: o, positionals: [dir] } = parseArgs({ args, allowPositionals: true, options: { "self-contained": { type: "boolean" } } });
    if (!dir) { console.error(USAGE); return 2; }
    const { report } = await import("./report.mjs");
    const r = report(dir, { selfContained: !!o["self-contained"] });
    console.log(`Wrote ${dir}/report.html, report.md and evidence.json (${r.files} evidence files)`);
    return 0;
  },
  async compare(args) {
    const [from, to] = args;
    if (!from || !to) { console.error(USAGE); return 2; }
    const { compare } = await import("./report.mjs");
    try {
      const r = compare(from, to);
      const by = (s) => r.findings.filter((f) => f.status === s).length;
      console.log(`${r.from} → ${r.to}: ${by("new")} new, ${by("persistent")} persistent, ${by("regressed")} regressed, ${by("resolved")} resolved, ${by("not-rechecked")} not rechecked`);
      return 0;
    } catch (e) { console.error(e.message); return e.code === "scope" ? 1 : 2; }
  },
  async gate(args) {
    const { values: o, positionals: [dir] } = parseArgs({ args, allowPositionals: true, options: { "fail-on": { type: "string", default: "P1" } } });
    if (!dir || !["P0", "P1", "P2", "P3"].includes(o["fail-on"])) { console.error(USAGE); return 2; }
    const { gate } = await import("./report.mjs");
    const g = gate(dir, o["fail-on"]);
    for (const f of g.open) console.log(`open ${f.priority} ${f.id}: ${f.title}`);
    for (const s of g.stages) console.log(`blocked stage ${s.stage}: ${s.reason ?? ""}`);
    console.log(g.ok ? `no open finding at ${o["fail-on"]} or above, and no blocked stage` : "gate failed");
    return g.ok ? 0 : 1;
  },
  async "validate-report"(args) {
    const [dir, ...rest] = args;
    if (!dir || rest.length) { console.error(USAGE); return 2; }
    const { existsSync } = await import("node:fs");
    if (!existsSync(dir)) { console.error(`${dir} does not exist`); return 2; }
    const { validateReport } = await import("./validate-report.mjs");
    const problems = validateReport(dir);
    for (const p of problems) console.log(`${p.file} ${p.path}  ${p.message}`);
    console.log(problems.length ? `${dir}: ${problems.length} problem${problems.length === 1 ? "" : "s"}` : `${dir}: valid`);
    return problems.length ? 1 : 0;
  },
  async baseline(args) {
    const { values: o } = parseArgs({ args, options: { manifest: { type: "string", default: "ux-assessment.yml" }, run: { type: "string" }, out: { type: "string" } } });
    const ready = await validated(o.manifest);
    if (typeof ready === "number") return ready;
    const { runId } = await import("./collect.mjs");
    const { baseline } = await import("./baseline.mjs");
    const { dir, record, stage } = await baseline({ ...ready, out: o.out, run: o.run ?? runId(), log: (m) => console.error(m) });
    for (const t of record.tests) console.log(`test ${t.id.padEnd(16)} ${t.status}${t.reason ? ` (${t.reason})` : ""}${t.counts !== "unknown" && t.counts ? ` — ${t.counts.passed} passed, ${t.counts.failed} failed, ${t.counts.skipped} skipped` : ""}`);
    if (record.audit) console.log(`audit: ${record.audit.findings.usability} usability and ${record.audit.findings.sdkAdoption} SDK-adoption findings${record.audit.pagesNotOnSdk.length ? `; ${record.audit.pagesNotOnSdk.length} page(s) not on the SDK, inspected as they are` : ""}`);
    if (stage.status !== "completed") console.error(`baseline ${stage.status}: ${stage.reason}`);
    console.log(`${record.note}\nWrote ${dir}/baseline.json`);
    return stage.status === "completed" ? 0 : 1;
  },
  async collect(args) {
    const { values: o } = parseArgs({ args, options: { manifest: { type: "string", default: "ux-assessment.yml" }, run: { type: "string" }, out: { type: "string" } } });
    const ready = await validated(o.manifest);
    if (typeof ready === "number") return ready;
    const { collect, runId } = await import("./collect.mjs");
    const r = collect({ ...ready, out: o.out, run: o.run ?? runId() });
    const p = r.requirements.problems;
    const crit = r.traceability.journeys.flatMap((j) => j.criteria);
    console.log(`${r.run.id}: ${r.requirements.documents.length} documents, ${r.requirements.criteria.length} criteria; journeys' criteria ${crit.filter((c) => c.link === "explicit").length} explicit, ${crit.filter((c) => c.link === "uncovered").length} uncovered; ${p.length} problem${p.length === 1 ? "" : "s"} recorded`);
    console.log(`Wrote ${r.dir}/requirements.json, traceability.json, run.json`);
    return 0;
  },
  async init(args) {
    const { values: o } = parseArgs({ args, options: { out: { type: "string", default: "ux-assessment.yml" } } });
    const { existsSync, writeFileSync } = await import("node:fs");
    if (existsSync(o.out)) { console.error(`${o.out} exists; not overwriting it.`); return 1; }
    const { propose } = await import("./init.mjs");
    const { text, manifest } = propose(process.cwd());
    writeFileSync(o.out, text);
    console.log(`Wrote ${o.out}: ${manifest.journeys.length} candidate journey${manifest.journeys.length === 1 ? "" : "s"}. Fill in every <fill-in: …>, then run: ux-builder-audit assess validate`);
    return 0;
  },
  async validate(args) {
    const { values: o } = parseArgs({ args, options: { manifest: { type: "string", default: "ux-assessment.yml" }, json: { type: "boolean" } } });
    const m = await loaded(o.manifest);
    if (typeof m === "number") return m;
    const { validate } = await import("./manifest.mjs");
    const { problems, helix } = validate(m);
    if (o.json) console.log(JSON.stringify({ problems, helix: helix && { marker: helix.marker.file, flow: helix.flow.id, root: helix.flow.rootRel, catalog: helix.catalog, documents: helix.documents } }, null, 2));
    else {
      for (const p of problems) console.log(`${p.path.padEnd(28)} ${p.message}`);
      if (helix) console.log(`HELIX: flow "${helix.flow.id}" (root ${helix.flow.rootRel}), catalogue ${helix.catalog.source}${helix.catalog.version ? ` ${helix.catalog.version}` : ""}, ${helix.documents} documents`);
      console.log(problems.length ? `${o.manifest}: ${problems.length} problem${problems.length === 1 ? "" : "s"}` : `${o.manifest}: valid`);
    }
    return problems.length ? 1 : 0;
  },
  async plan(args) {
    const { values: o } = parseArgs({ args, options: { manifest: { type: "string", default: "ux-assessment.yml" }, run: { type: "string" }, out: { type: "string" }, agent: { type: "string" }, model: { type: "string" } } });
    if (!o.run) { console.error("plan needs --run: the run collect wrote"); return 2; }
    const ready = await validated(o.manifest);
    if (typeof ready === "number") return ready;
    const { plan } = await import("./plan.mjs");
    try {
      const { dir, journeys, entries, stage } = plan({ ...ready, out: o.out, run: o.run, agent: o.agent, model: o.model });
      console.log(`${o.run}: ${journeys.length} journeys, ${entries.filter((e) => e.status === "not-assessed").length} pairs to walk, ${entries.filter((e) => e.status === "blocked").length} blocked, ${entries.filter((e) => e.status === "not-applicable").length} not applicable\nWrote ${dir}/plan.json, coverage.json`);
      if (stage.status !== "completed") console.error(`plan ${stage.status}: ${stage.reason}`);
      return stage.status === "completed" ? 0 : 1;
    } catch (e) { console.error(e.message); return e.code === "blocked" ? 1 : 2; }
  },
  async merge(args) {
    const { values: o } = parseArgs({ args, options: { manifest: { type: "string", default: "ux-assessment.yml" }, run: { type: "string" }, out: { type: "string" } } });
    const ready = await validated(o.manifest);
    if (typeof ready === "number") return ready;
    if (!o.run) { console.error("merge needs --run"); return 2; }
    const { merge, runDir } = await import("./plan.mjs");
    const { existsSync, readFileSync, writeFileSync } = await import("node:fs");
    const file = `${runDir(ready.manifest, ready.resolved, o.out, o.run)}/backlog.json`;
    if (!existsSync(file)) { console.error(`${file} does not exist`); return 1; }
    const b = JSON.parse(readFileSync(file, "utf8"));
    const before = b.findings.length;
    b.findings = merge(b.findings);
    writeFileSync(file, JSON.stringify(b, null, 2) + "\n");
    console.log(`${before} findings → ${b.findings.length}, each with a stable ID`);
    return 0;
  },
  async reset(args) {
    const { values: o } = parseArgs({ args, options: { manifest: { type: "string", default: "ux-assessment.yml" }, fixture: { type: "string" } } });
    const ready = await validated(o.manifest);
    if (typeof ready === "number") return ready;
    const f = (ready.resolved.fixtures ?? []).find((x) => x.id === o.fixture);
    if (!f) { console.error(`no fixture "${o.fixture}" in the manifest`); return 2; }
    if (!f.reset) { console.log(`fixture ${f.id} has no reset`); return 0; }
    const { spawnSync } = await import("node:child_process");
    const r = spawnSync(f.reset, { shell: true, cwd: ready.resolved.run.cwd, stdio: "inherit" });
    return r.status === 0 ? 0 : 1;
  },
  async browser(args) {
    const { values: o } = parseArgs({ args, options: { port: { type: "string" }, headed: { type: "boolean" }, manifest: { type: "string" }, run: { type: "string" }, out: { type: "string" } } });
    let origins = [], exclude = [], runRoot = null, limits = null;
    if (o.manifest) {
      const ready = await validated(o.manifest); if (typeof ready === "number") return ready;
      origins = ready.resolved.run.origins; exclude = ready.resolved.restrictions.excludeIntegrations;
      if (o.run) { const { runDir } = await import("./plan.mjs"); runRoot = runDir(ready.manifest, ready.resolved, o.out, o.run); limits = ready.resolved.limits; }
    }
    const { startBrowser, limitReached, recordStage } = await import("./checkpoint.mjs");
    const { readFileSync } = await import("node:fs");
    // The run's time (limits.runMinutes): none left, the browser does not start (AGW-02).
    const spent = runRoot && limitReached({ runRoot, steps: 0, limits: { runMinutes: limits.runMinutes } });
    if (spent) { recordStage(runRoot, { stage: "walkthrough", status: "partial", reason: `limit reached: ${spent}` }); console.error(`blocked: limit — ${spent}; the browser was not started`); return 1; }
    let started;
    try { started = await startBrowser({ port: o.port ? Number(o.port) : undefined, headed: o.headed, origins, exclude }); } catch (e) {
      if (runRoot) recordStage(runRoot, { stage: "walkthrough", status: "blocked", reason: `no browser: Chromium did not start (${e.message.split("\n")[0]})` });
      console.error(`Chromium did not start: ${e.message.split("\n")[0]}`);
      return 1;
    }
    const { cdp, browser } = started;
    if (origins.length) console.error(`Only ${origins.join(", ")} can load in this browser${exclude.length ? `; never ${exclude.join(", ")}` : ""}.`);
    console.log(JSON.stringify({ cdp }));
    console.error(`Chromium is listening at ${cdp}. Connect the browser driver to it, e.g.\n  npx @playwright/mcp --cdp-endpoint ${cdp}\nCtrl-C stops it.`);
    let timer, code = 0;
    await new Promise((resolve) => {
      for (const s of ["SIGINT", "SIGTERM"]) process.once(s, resolve);
      if (runRoot) {
        let startedAt = Date.now();
        try { startedAt = Date.parse(JSON.parse(readFileSync(`${runRoot}/run.json`, "utf8")).startedAt) || startedAt; } catch { /* no run record yet */ }
        timer = setTimeout(() => { code = 1; const why = `the run's ${limits.runMinutes} minutes (limits.runMinutes) are spent`; recordStage(runRoot, { stage: "walkthrough", status: "partial", reason: `limit reached: ${why}` }); console.error(`blocked: limit — ${why}; stopping the browser`); resolve(); }, Math.max(0, startedAt + limits.runMinutes * 60_000 - Date.now()));
      }
    });
    clearTimeout(timer);
    await browser.close();
    return code;
  },
  async inspect(args) {
    const { values: o } = parseArgs({ args, options: {
      cdp: { type: "string" }, page: { type: "string" }, replay: { type: "string" }, checkpoint: { type: "string" },
      journey: { type: "string" }, step: { type: "string" }, role: { type: "string" }, state: { type: "string" },
      "state-affecting": { type: "boolean" }, redact: { type: "string", multiple: true }, manifest: { type: "string" }, out: { type: "string" }, run: { type: "string" },
      scenario: { type: "string" }, "high-impact-step": { type: "string" },
    } });
    if (!o.checkpoint || !(o.replay || (o.cdp && o.page))) { console.error(USAGE); return 2; }
    if (o.scenario && !["normal", "errorProne", "risky"].includes(o.scenario)) { console.error(`--scenario must be normal, errorProne or risky\n${USAGE}`); return 2; }
    if (o["high-impact-step"] && !/^[1-9]\d*$/.test(o["high-impact-step"])) { console.error("--high-impact-step must be a step number (1-based)"); return 2; }
    // With the manifest: its output path, origins and redaction apply (ENV-02, ENV-03).
    let extra = { out: o.out ?? "ux-assessment" };
    if (o.manifest) {
      const ready = await validated(o.manifest);
      if (typeof ready === "number") return ready;
      const { runDir } = await import("./plan.mjs");
      const r = ready.resolved;
      // The journey's risky step, when the manifest gives it as a number.
      const j = (r.journeys ?? []).find((x) => x.id === o.journey);
      const { riskyStep } = await import("./ai.mjs");
      const step = j && o.scenario === "risky" ? riskyStep(j) : null;
      extra = { highImpactStep: Number.isInteger(step) ? step : undefined, out: o.out ?? runDir(ready.manifest, r, undefined, ".").replace(/\/\.$/, ""), origins: r.run.origins, exclude: r.restrictions.excludeIntegrations, allow: r.restrictions.allow, deny: r.restrictions.deny, capture: r.evidence?.capture ?? "both", limits: r.limits, redactText: r.evidence?.redact?.text ?? [], cwd: r.run.cwd, redactSelectors: r.evidence?.redact?.selectors ?? [] };
    }
    const { checkpoint, runId } = await import("./checkpoint.mjs");
    const { code, record } = await checkpoint({ ...o, ...extra, highImpactStep: o["high-impact-step"] ?? extra.highImpactStep, run: o.run ?? runId(), stateAffecting: !!o["state-affecting"], redact: [...(o.redact ?? []), ...(extra.redactSelectors ?? [])] });
    console.log(code ? `${record.checkpoint.id}: ${record.message}` : `${record.checkpoint.id}: ${record.findings.length} finding${record.findings.length === 1 ? "" : "s"} at ${record.url} (${record.mode})`);
    return code;
  },
};

/* Load a manifest, or the exit code for one that cannot be read. */
async function loaded(file) {
  const { existsSync } = await import("node:fs");
  if (!existsSync(file)) { console.error(`${file} not found; propose one with: ux-builder-audit assess init`); return 2; }
  const { load } = await import("./manifest.mjs");
  try { return load(file); } catch (e) { console.error(`${file}: ${e.message.split("\n")[0]}`); return 2; }
}

/* A manifest that validates, with its HELIX binding, or the exit code: a
   manifest with problems blocks the stage (printed with their paths). */
async function validated(file) {
  const m = await loaded(file);
  if (typeof m === "number") return m;
  const { validate } = await import("./manifest.mjs");
  const { problems, helix, resolved } = validate(m);
  if (problems.length) {
    for (const p of problems) console.error(`${p.path.padEnd(28)} ${p.message}`);
    console.error(`${file}: ${problems.length} problem${problems.length === 1 ? "" : "s"}; fix them first (ux-builder-audit assess validate)`);
    return 1;
  }
  return { manifest: m, resolved, helix };
}

export async function main(argv) {
  const [sub, ...rest] = argv;
  if (!SUB[sub] || rest.includes("--help") || rest.includes("-h")) { console.error(USAGE); return sub && !SUB[sub] ? 2 : rest.length ? 0 : 2; }
  try { return await SUB[sub](rest); } catch (e) { console.error(`ux-builder-audit assess ${sub}: ${e.message}`); return 2; }
}
