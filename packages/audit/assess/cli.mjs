/* ux-builder-audit assess <subcommand>: the assessment's deterministic
   operations (FEAT-009; CONTRACT-006 "Command"). The coding agent, guided by
   the ux-builder-assess skill, does the reasoning around them.

     init        propose ux-assessment.yml from the repository
     validate    check the manifest against its schema, the repository and HELIX
     collect     map the HELIX documents and criteria to the journeys and tests
     browser     start Chromium with a CDP endpoint for the agent's driver
     inspect     inspect a checkpoint: the agent's page in place, or a replay

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
  browser [--port n] [--headed]
      Start Chromium with a CDP endpoint and print it; connect the agent's
      browser driver to it (Playwright MCP: --cdp-endpoint <url>). Ctrl-C stops it.
  inspect (--cdp <url> --page <url-match> | --replay <steps.json>) --checkpoint <C-id>
          [--journey <J-id>] [--step n] [--role id] [--state class]
          [--state-affecting] [--redact <selector>]... [--out dir] [--run R-id]
      Inspect the page in place (or a verified replay) and write
      <out>/<run>/checkpoints/<id>/inspection.json, screenshot.png, tree.yml.`;

const SUB = {
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
  async browser(args) {
    const { values: o } = parseArgs({ args, options: { port: { type: "string" }, headed: { type: "boolean" } } });
    const { startBrowser } = await import("./checkpoint.mjs");
    const { cdp, browser } = await startBrowser({ port: o.port ? Number(o.port) : undefined, headed: o.headed });
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
      "state-affecting": { type: "boolean" }, redact: { type: "string", multiple: true }, out: { type: "string", default: "ux-assessment" }, run: { type: "string" },
    } });
    if (!o.checkpoint || !(o.replay || (o.cdp && o.page))) { console.error(USAGE); return 2; }
    const { checkpoint, runId } = await import("./checkpoint.mjs");
    const { code, record } = await checkpoint({ ...o, run: o.run ?? runId(), stateAffecting: !!o["state-affecting"], redact: o.redact ?? [] });
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
