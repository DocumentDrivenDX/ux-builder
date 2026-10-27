/* ux-builder-audit assess baseline: the app's functional tests and the
   audit, recorded before any change (FEAT-009 BAS-01 to BAS-04, ENV-03;
   US-059; CONTRACT-006 "baseline.json").

   Runs each declared test command and records exactly what happened, then
   serves the app and audits it at the manifest's URLs, widths, themes and
   appearances. A page that is not on the SDK is also inspected as it is,
   with the SDK-conformance checks off, so its usability findings are not
   lost; findings that only mean "not on the SDK" are counted apart. Never
   retries a test, and never changes the app. */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { chromium } from "playwright";
import { audit, RULES } from "../audit.mjs";
import { enrich, inspect, prepare } from "../inspect.mjs";
import { writeReports } from "../report.mjs";
import { serve } from "../serve.mjs";
import { versions } from "./collect.mjs";
import { SECRETS } from "./manifest.mjs";
import { reportsOf } from "@ux-builder/ui/blueprint/paths";

export const NOTE = "Passing functional tests do not show that usability criteria are met.";
// Checks that hold an app to the SDK's theme: on a page not on the SDK they only mean "not yet on the SDK".
export const CONFORMANCE = ["theme-applied", "token-colors", "token-fonts", "token-radii", "token-overrides", "widget-overrides", "sdk-widgets", "foreign-components", "outside-theme", "brand", "fonts"];
const ADOPTION = new Set(["theme-applied", "sdk-widgets", "foreign-components", "brand", "fonts"]);

/* Mask referenced credentials and anything that looks like one (ENV-03). */
export function masker(resolved, env = process.env) {
  const values = (resolved.roles ?? []).map((r) => r.auth?.env && env[r.auth.env]).filter((v) => v && v.length >= 4);
  return (text) => {
    let t = text;
    for (const v of values) t = t.split(v).join("***");
    for (const [re] of SECRETS) t = t.replace(new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g"), "***");
    return t;
  };
}

/* Counts from a runner's report, or "unknown". */
export function counts(report, cwd) {
  if (!report) return "unknown";
  const file = resolve(cwd, report.path);
  if (!existsSync(file)) return "unknown";
  const text = readFileSync(file, "utf8");
  try {
    if (report.format === "junit") {
      const suites = [...text.matchAll(/<testsuite\b([^>]*)>/g)].map((m) => Object.fromEntries([...m[1].matchAll(/(\w+)="(\d+)"/g)].map(([, k, v]) => [k, Number(v)])));
      const sum = (k) => suites.reduce((n, s) => n + (s[k] ?? 0), 0);
      const failed = sum("failures") + sum("errors"), skipped = sum("skipped");
      return { passed: sum("tests") - failed - skipped, failed, skipped };
    }
    if (report.format === "playwright-json") {
      const s = JSON.parse(text).stats ?? {};
      return { passed: (s.expected ?? 0) + (s.flaky ?? 0), failed: s.unexpected ?? 0, skipped: s.skipped ?? 0 };
    }
    if (report.format === "node-tap") {
      const n = (k) => Number(new RegExp(`^# ${k} (\\d+)`, "m").exec(text)?.[1] ?? 0);
      return { passed: n("pass"), failed: n("fail"), skipped: n("skipped") + n("todo") };
    }
  } catch { /* unreadable */ }
  return "unknown";
}

function runCommand({ command, cwd, timeoutMs, mask, log }) {
  return new Promise((done) => {
    const started = Date.now();
    let out = "", timedOut = false;
    const child = spawn(command, { shell: true, cwd, detached: true, env: { ...process.env, CI: process.env.CI ?? "1" } });
    child.stdout.on("data", (d) => { out += d; }); child.stderr.on("data", (d) => { out += d; });
    const timer = setTimeout(() => { timedOut = true; try { process.kill(-child.pid, "SIGKILL"); } catch { /* gone */ } }, timeoutMs);
    child.on("error", (e) => { out += `\n${e.message}`; });
    child.on("close", (code) => {
      clearTimeout(timer);
      writeFileSync(log, mask(out));
      done({ exitCode: code, durationMs: Date.now() - started, timedOut });
    });
  });
}

/* Run the baseline for a validated manifest; writes under <out>/<run>/. */
export async function baseline({ manifest, resolved, out, run, now = new Date(), log = () => {} }) {
  const dir = resolve(manifest.dir, out ?? resolved.evidence?.out ?? reportsOf(manifest.dir).assessments, run);
  mkdirSync(join(dir, "logs"), { recursive: true });
  const mask = masker(resolved);
  const cwd = resolved.run.cwd;
  const tests = [];
  for (const t of resolved.tests ?? []) {
    log(`  test ${t.id}: ${t.command}`);
    const logFile = join(dir, "logs", `${t.id}.log`);
    const r = await runCommand({ command: t.command, cwd, timeoutMs: (t.timeoutMinutes ?? resolved.limits?.journeyMinutes ?? 15) * 60_000, mask, log: logFile });
    const status = r.timedOut ? "error" : r.exitCode === 0 ? "passed" : r.exitCode === 127 ? "not-run" : "failed";
    tests.push({ id: t.id, command: t.command, status, ...(r.timedOut ? { reason: "timeout" } : r.exitCode === 127 ? { reason: "command not found" } : {}), exitCode: r.exitCode, durationMs: r.durationMs, counts: status === "not-run" ? "unknown" : counts(t.report, cwd), log: relative(dir, logFile) });
  }

  // The audit, with the app served for it.
  const a = resolved.audit ?? {};
  const base = resolved.run.baseUrl;
  const urls = (a.urls?.length ? a.urls : [base]).map((u) => new URL(u, base).href);
  const off = a.off ?? [];
  const unsupported = off.filter((c) => !RULES[c]);
  let audited = null, stage = { stage: "baseline", status: "completed" };
  let server = null;
  try {
    if (resolved.run.start) server = await serve({ command: resolved.run.start, url: resolved.run.ready?.url ?? base, cwd, timeoutMs: resolved.run.ready?.timeoutMs ?? 60_000, status: resolved.run.ready?.status ?? 500 });
    log(`  audit ${urls.join(", ")}`);
    const report = await audit({ urls, themes: a.themes, appearances: a.appearances ?? ["light", "dark"], widths: a.widths, wait: a.wait, rules: Object.fromEntries(off.filter((c) => RULES[c]).map((c) => [c, false])), cwd, out: join(dir, "audit") });
    writeReports(report, join(dir, "audit"));
    // Pages not on the SDK: inspected as they are, conformance off (BAS-03).
    const asIs = [];
    const bare = urls.filter((u) => !report.runs.some((r) => r.url === u));
    if (bare.length) {
      const sdk = prepare(cwd);
      const browser = await chromium.launch();
      try {
        for (const url of bare) for (const width of a.widths?.length ? a.widths : [1280]) {
          const page = await (await browser.newContext({ viewport: { width, height: 900 } })).newPage();
          await page.goto(url, { waitUntil: "networkidle" });
          if (a.wait) await page.waitForSelector(a.wait);
          const r = await inspect(page, { sdk, layout: !!a.widths?.length, stateAffecting: ["focus-obscured"], rules: { ...Object.fromEntries(CONFORMANCE.map((c) => [c, false])), ...Object.fromEntries(off.map((c) => [c, false])) } });
          asIs.push(...enrich(r.findings, sdk.interaction).map((f) => ({ url, width, ...f, finding_type: "deterministic" })));
          await page.context().close();
        }
      } finally { await browser.close(); }
      writeFileSync(join(dir, "audit", "as-is.json"), JSON.stringify({ schema: "as-is", version: 1, note: "Pages not on the SDK, inspected as they are with the SDK-conformance checks off.", findings: asIs }, null, 2) + "\n");
    }
    const checkOf = (f) => f.check ?? f.rule;
    const all = [...report.findings, ...asIs].filter((f) => f.severity !== "info" || checkOf(f) === "theme-applied");
    const isAdoption = (f) => ADOPTION.has(checkOf(f)) || (CONFORMANCE.includes(checkOf(f)) && bare.includes(f.url));
    audited = {
      report: "audit/report.json", ...(asIs.length || bare.length ? { asIs: "audit/as-is.json" } : {}),
      urls, widths: a.widths ?? [], off, unsupported, pagesNotOnSdk: bare,
      findings: { usability: all.filter((f) => !isAdoption(f)).length, sdkAdoption: all.filter(isAdoption).length },
      summary: report.summary,
    };
  } catch (e) {
    stage = { stage: "baseline", status: "blocked", reason: e.message };
  } finally {
    server?.stop();
  }
  const record = { schema: "baseline", version: 1, run, recordedAt: now.toISOString(), tests, audit: audited, versions: versions(cwd), note: NOTE };
  writeFileSync(join(dir, "baseline.json"), JSON.stringify(record, null, 2) + "\n");
  const runFile = join(dir, "run.json");
  const prior = existsSync(runFile) ? JSON.parse(readFileSync(runFile, "utf8")) : { schema: "run", version: 1, id: run, startedAt: now.toISOString() };
  prior.stages = [...(prior.stages ?? []).filter((s) => s.stage !== "baseline"), { ...stage, startedAt: now.toISOString(), finishedAt: new Date().toISOString() }];
  prior.versions ??= versions(cwd);
  writeFileSync(runFile, JSON.stringify(prior, null, 2) + "\n");
  return { dir, record, stage };
}
