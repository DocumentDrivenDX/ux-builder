/* ux-builder-audit assess <subcommand>: the assessment's deterministic
   operations (FEAT-009; CONTRACT-006 "Command"). The coding agent, guided by
   the ux-builder-assess skill, does the reasoning around them.

     browser     start Chromium with a CDP endpoint for the agent's driver
     inspect     inspect a checkpoint: the agent's page in place, or a replay

   Exit codes: 0 done; 1 the stage could not complete (reported); 2 usage. */

import { parseArgs } from "node:util";

const USAGE = `Usage: ux-builder-audit assess <subcommand> [options]

  browser [--port n] [--headed]
      Start Chromium with a CDP endpoint and print it; connect the agent's
      browser driver to it (Playwright MCP: --cdp-endpoint <url>). Ctrl-C stops it.
  inspect (--cdp <url> --page <url-match> | --replay <steps.json>) --checkpoint <C-id>
          [--journey <J-id>] [--step n] [--role id] [--state class]
          [--state-affecting] [--redact <selector>]... [--out dir] [--run R-id]
      Inspect the page in place (or a verified replay) and write
      <out>/<run>/checkpoints/<id>/inspection.json, screenshot.png, tree.yml.`;

const SUB = {
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

export async function main(argv) {
  const [sub, ...rest] = argv;
  if (!SUB[sub] || rest.includes("--help") || rest.includes("-h")) { console.error(USAGE); return sub && !SUB[sub] ? 2 : rest.length ? 0 : 2; }
  try { return await SUB[sub](rest); } catch (e) { console.error(`ux-builder-audit assess ${sub}: ${e.message}`); return 2; }
}
