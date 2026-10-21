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
     validate-report  check a run package before handing it over
     propose     propose a change to a HELIX artifact for a finding (a patch; nothing applied)
     check-writes  list files under the HELIX root or the app changed during the run
     apply-check   check a proposal's target is unchanged before it is applied
     report      write report.html, report.md and evidence.json
     compare     classify findings across two runs of one scope
     gate        CI exit: fail on open findings at a priority, or a blocked stage

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
  browser [--port n] [--headed] [--manifest f]
      Start Chromium with a CDP endpoint and print it; connect the agent's
      browser driver to it (Playwright MCP: --cdp-endpoint <url>). Ctrl-C stops it.
  inspect (--cdp <url> --page <url-match> | --replay <steps.json>) --checkpoint <C-id>
          [--journey <J-id>] [--step n] [--role id] [--state class]
          [--state-affecting] [--redact <selector>]... [--manifest f] [--out dir] [--run R-id]
      Inspect the page in place (or a verified replay) and write
      <out>/<run>/checkpoints/<id>/inspection.json, screenshot.png, tree.yml.
  validate-report <run-dir>
      Check every record in a run package, that its evidence resolves, and that
      findings relying on a conflicting HELIX ID are qualified.

  propose --run R-id --finding F-id (--target <HELIX ID> | --new <type> [--title t])
          --kind new-requirement|unmet-criterion|scope --criterion "Given…" --test "…" [--test-file f]
      Write a patch in proposals/ for one finding; nothing is applied.
  check-writes --run R-id
      List files under the HELIX root or the app that changed during the run.
  apply-check P-n --run R-id
      Check a proposal's target is unchanged since the proposal was written.
  report <run-dir> [--self-contained]
      Write report.html, report.md and evidence.json; --self-contained embeds the screenshots.
  compare <earlier-run-dir> <later-run-dir>
      Classify findings: new, persistent, resolved, regressed, not rechecked.
  gate <run-dir> [--fail-on P0|P1|P2|P3]
      For CI: exit 1 on an open finding at that priority or above, or a blocked stage.

The ux-builder-assess skill (node_modules/@ux-builder/audit/skill/) says how
an agent runs these as one assessment.`;

const SUB = {
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
      const { dir, journeys, entries } = plan({ ...ready, out: o.out, run: o.run, agent: o.agent, model: o.model });
      console.log(`${o.run}: ${journeys.length} journeys, ${entries.filter((e) => e.status === "not-assessed").length} pairs to walk, ${entries.filter((e) => e.status === "not-applicable").length} not applicable\nWrote ${dir}/plan.json, coverage.json`);
      return 0;
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
    const { values: o } = parseArgs({ args, options: { port: { type: "string" }, headed: { type: "boolean" }, manifest: { type: "string" } } });
    let origins = [];
    if (o.manifest) { const ready = await validated(o.manifest); if (typeof ready === "number") return ready; origins = ready.resolved.run.origins; }
    const { startBrowser } = await import("./checkpoint.mjs");
    const { cdp, browser } = await startBrowser({ port: o.port ? Number(o.port) : undefined, headed: o.headed, origins });
    if (origins.length) console.error(`Only ${origins.join(", ")} can load in this browser.`);
    console.log(JSON.stringify({ cdp }));
    console.error(`Chromium is listening at ${cdp}. Connect the browser driver to it, e.g.\n  npx @playwright/mcp --cdp-endpoint ${cdp}\nCtrl-C stops it.`);
    await new Promise((resolve) => { for (const s of ["SIGINT", "SIGTERM"]) process.once(s, resolve); });
    await browser.close();
    return 0;
  },
  async inspect(args) {
    const { values: o } = parseArgs({ args, options: {
      cdp: { type: "string" }, page: { type: "string" }, replay: { type: "string" }, checkpoint: { type: "string" },
      journey: { type: "string" }, step: { type: "string" }, role: { type: "string" }, state: { type: "string" },
      "state-affecting": { type: "boolean" }, redact: { type: "string", multiple: true }, manifest: { type: "string" }, out: { type: "string" }, run: { type: "string" },
    } });
    if (!o.checkpoint || !(o.replay || (o.cdp && o.page))) { console.error(USAGE); return 2; }
    // With the manifest: its output path, origins and redaction apply (ENV-02, ENV-03).
    let extra = { out: o.out ?? "ux-assessment" };
    if (o.manifest) {
      const ready = await validated(o.manifest);
      if (typeof ready === "number") return ready;
      const { runDir } = await import("./plan.mjs");
      const r = ready.resolved;
      extra = { out: o.out ?? runDir(ready.manifest, r, undefined, ".").replace(/\/\.$/, ""), origins: r.run.origins, redactText: r.evidence?.redact?.text ?? [], cwd: r.run.cwd, redactSelectors: r.evidence?.redact?.selectors ?? [] };
    }
    const { checkpoint, runId } = await import("./checkpoint.mjs");
    const { code, record } = await checkpoint({ ...o, ...extra, run: o.run ?? runId(), stateAffecting: !!o["state-affecting"], redact: [...(o.redact ?? []), ...(extra.redactSelectors ?? [])] });
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
