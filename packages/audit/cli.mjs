#!/usr/bin/env node
/* ux-builder-audit: audit a running app's use of the AI-UI SDK theme (US-022,
   FEAT-004 SDK-18).

     npx ux-builder-audit http://localhost:5173/
     npx ux-builder-audit --serve "npm run preview -- --port 4173" http://localhost:4173/ /settings

   Options:
     --theme <name>        audit only this theme (repeat for more; default: every theme the page loads)
     --appearance <a>      light or dark (repeat; default: both)
     --width <px>          audit at this window width (repeat, e.g. one per size class:
                           --width 360 --width 720 --width 1024 --width 1366 --width 1920;
                           default: 1280 only). Adds the reflow, target-size and
                           focus-obscured checks at each width
     --serve "<command>"   start the app with this command first, wait for the first URL, stop it after
     --wait <selector>     wait for this element before auditing each page
     --ignore <selector>   leave these elements out (repeat; elements with data-audit-ignore always are)
     --off <check>         turn a check off (repeat), e.g. --off token-radii
     --no-contrast         skip axe's colour-contrast check
     --out <dir>           where the report goes (default: audit-report)
     --fail-on <level>     error (default), warning or never: what makes the exit code 1
     --json                print the report as JSON instead of the summary
     --write-baseline <f>  write every finding to this file, to adopt the audit in an existing app
     --baseline <f>        leave out the findings in this file: they neither show as new nor fail the
                           build; those no longer found are listed as resolved

   A URL that starts with "/" is taken relative to the first full URL. The
   browser is Playwright's Chromium: install it once with
   npx playwright install chromium. */

// The assessment's subcommands (FEAT-009) parse their own options.
if (process.argv[2] === "assess") {
  const { main } = await import("./assess/cli.mjs");
  process.exit(await main(process.argv.slice(3)));
}

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { RULES, VERSION, audit, toBaseline } from "./audit.mjs";
import { summaryText, writeReports } from "./report.mjs";

const { values: o, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    theme: { type: "string", multiple: true }, appearance: { type: "string", multiple: true }, width: { type: "string", multiple: true },
    serve: { type: "string" }, wait: { type: "string" }, ignore: { type: "string", multiple: true },
    off: { type: "string", multiple: true }, "no-contrast": { type: "boolean" },
    out: { type: "string", default: "audit-report" }, "fail-on": { type: "string", default: "error" },
    json: { type: "boolean" }, "write-baseline": { type: "string" }, baseline: { type: "string" }, version: { type: "boolean" }, help: { type: "boolean", short: "h" },
  },
});
if (o.version) { console.log(VERSION); process.exit(0); }
if (o.help || !positionals.length) {
  console.log(`ux-builder-audit [options] <url> [<url or /path> …]\n\nChecks: ${Object.keys(RULES).join(", ")}\nSee the package README for every option.`);
  process.exit(o.help ? 0 : 2);
}
for (const c of o.off ?? []) if (!RULES[c]) { console.error(`ux-builder-audit: no check called "${c}"; checks: ${Object.keys(RULES).join(", ")}`); process.exit(2); }
const widths = (o.width ?? []).map(Number);
if (widths.some((w) => !Number.isInteger(w) || w < 200 || w > 4000)) { console.error("ux-builder-audit: --width is a whole number of CSS pixels between 200 and 4000"); process.exit(2); }
if (!["error", "warning", "never"].includes(o["fail-on"])) { console.error("ux-builder-audit: --fail-on is error, warning or never"); process.exit(2); }

if (o.baseline && o["write-baseline"]) { console.error("ux-builder-audit: give --baseline or --write-baseline, not both"); process.exit(2); }
let baseline = null;
if (o.baseline) {
  try { baseline = JSON.parse(readFileSync(o.baseline, "utf8")); } catch (e) { console.error(`ux-builder-audit: --baseline ${o.baseline}: ${e.message}`); process.exit(2); }
}

const base = positionals.find((u) => /^https?:/.test(u));
const urls = positionals.map((u) => (u.startsWith("/") && base ? new URL(u, base).href : u));

let server = null;
async function serve() {
  if (!o.serve) return;
  const { serve: start } = await import("./serve.mjs");
  server = await start({ command: o.serve, url: urls[0] }).catch((e) => { throw new Error(e.code === "exited" ? `--serve ${e.message}` : `${urls[0]} did not answer within a minute of --serve`); });
}
const stop = () => server?.stop();
process.on("exit", stop);

try {
  await serve();
  const out = resolve(o.out);
  if (!o.json) console.error(`Auditing ${urls.join(", ")} …`);
  const report = await audit({
    urls, themes: o.theme, appearances: o.appearance ?? ["light", "dark"], widths, wait: o.wait, ignore: o.ignore ?? [],
    rules: Object.fromEntries((o.off ?? []).map((c) => [c, false])), contrast: !o["no-contrast"], out, baseline,
    log: o.json ? () => {} : (m) => console.error(m),
  });
  writeReports(report, out);
  if (o["write-baseline"]) {
    writeFileSync(o["write-baseline"], JSON.stringify(toBaseline(report), null, 2) + "\n");
    if (!o.json) console.error(`Baseline: ${toBaseline(report).findings.length} findings written to ${o["write-baseline"]}`);
  }
  if (o.json) console.log(JSON.stringify(report, null, 2));
  else console.log(`${summaryText(report)}\n\nReport: ${resolve(out, "index.html")}`);
  const fail = o["fail-on"] === "never" ? false : o["fail-on"] === "warning" ? report.summary.error + report.summary.warning > 0 : report.summary.error > 0;
  stop();
  process.exit(fail ? 1 : 0);
} catch (e) {
  console.error(`ux-builder-audit: ${e.message}`);
  stop();
  process.exit(2);
}
