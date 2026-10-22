/* ux-builder-trace lint: the app's lint, recorded as one `check` event
   (US-106-AC2, CONTRACT-007).

   The ESLint and Stylelint plugins see one file at a time and never the end
   of a run, so they cannot write a check. This runs both linters through
   their Node APIs, the app's own copies with the app's own configuration
   (eslint.config.js, .stylelintrc.json), prints what each finds as their CLIs
   do, and writes one lint check: its status (fail on an error, warn on a
   warning), its attempt, and each rule with its severity and count. No file
   name, line or message goes in the event, only rule IDs and counts.

     ux-builder-trace lint --stylelint "src/**\/*.css" --eslint src   # a created app's npm run lint */

import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { BY, countFindings, recordCheck } from "./index.mjs";

/* A linter as the app has it installed, else the one beside this package. */
async function load(appDir, name) {
  const from = [createRequire(join(appDir, "package.json")), createRequire(import.meta.url)];
  for (const req of from) {
    let path;
    try { path = req.resolve(name); } catch { continue; }
    return import(pathToFileURL(path).href);
  }
  throw new Error(`${name} is not installed in ${appDir} (npm install -D ${name})`);
}

/* Run the linters; print their reports; record the check. Returns
   { status, findings, event, errors, warnings }. Throws when a linter cannot
   run (a missing package or a broken configuration): then nothing is recorded. */
export async function lint(appDir, { eslint = [], stylelint = [], by = BY, out = process.stdout } = {}) {
  const found = [];
  if (stylelint.length) {
    const mod = await load(appDir, "stylelint");
    const api = mod.default ?? mod;
    const r = await api.lint({ files: stylelint, cwd: appDir, formatter: "string", allowEmptyInput: true });
    const text = r.report ?? r.output ?? "";
    if (text.trim()) out.write(text.endsWith("\n") ? text : `${text}\n`);
    for (const res of r.results ?? []) {
      for (const w of res.warnings ?? []) found.push({ ruleId: w.rule ?? "stylelint", severity: w.severity === "warning" ? "warning" : "error" });
      for (const w of res.invalidOptionWarnings ?? []) found.push({ ruleId: "stylelint/invalid-option", severity: "error", text: w.text });
    }
  }
  if (eslint.length) {
    const { ESLint } = await load(appDir, "eslint");
    const engine = new ESLint({ cwd: appDir });
    const results = await engine.lintFiles(eslint);
    const text = await (await engine.loadFormatter("stylish")).format(results);
    if (text.trim()) out.write(text.endsWith("\n") ? text : `${text}\n`);
    for (const res of results) for (const m of res.messages) found.push({ ruleId: m.ruleId ?? (m.fatal ? "eslint/parse-error" : "eslint"), severity: m.severity === 2 ? "error" : "warning" });
  }
  const findings = countFindings(found);
  const errors = found.filter((f) => f.severity === "error").length, warnings = found.length - errors;
  const status = errors ? "fail" : warnings ? "warn" : "pass";
  const event = recordCheck(appDir, "lint", { status, findings }, { by });
  return { status, findings, event, errors, warnings };
}
