/* The audit in the app's episode trace (FEAT-016 TRC-03, US-106-AC2;
   CONTRACT-007): each run of ux-builder-audit in an app that keeps a trace
   writes a check event, with its status, attempt, findings per rule,
   verdicts and report; outside one it writes nothing.

     npm run build && npm test --workspace @ux-builder/audit */

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { listEpisodes, readEpisode, validateEvent } from "@ux-builder/trace";
import { auditCheck } from "../trace.mjs";

const PKG = fileURLToPath(new URL("..", import.meta.url));
const FIXTURES = join(PKG, "test/fixtures/ai");
const FILES = { "/themes.css": join(PKG, "../tokens/dist/themes.css"), "/fonts.css": join(PKG, "../tokens/dist/fonts.css"), "/ui.css": join(PKG, "../ui/dist/ui.css") };
const tmp = mkdtempSync(join(tmpdir(), "audit-trace-"));
const app = join(tmp, "app"), outside = join(tmp, "outside");
let server, base;

before(async () => {
  for (const d of [app, outside]) mkdirSync(d);
  mkdirSync(join(app, ".ux-builder"));
  writeFileSync(join(app, "package.json"), JSON.stringify({ name: "traced", private: true }) + "\n");
  server = createServer((req, res) => {
    const path = new URL(req.url, "http://x").pathname;
    const fixture = join(FIXTURES, path.slice(1));
    if (path.endsWith(".html") && existsSync(fixture)) { res.writeHead(200, { "content-type": "text/html" }); res.end(readFileSync(fixture)); return; }
    const file = FILES[path] ?? (path.startsWith("/fonts/") || path.startsWith("/brand/") ? join(PKG, "../tokens/dist", path) : null);
    if (!file || !existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "content-type": { ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2" }[extname(file)] ?? "application/octet-stream" });
    res.end(readFileSync(file));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server?.close(); rmSync(tmp, { recursive: true, force: true }); });

const audit = (cwd, page) => new Promise((resolve) => {
  const c = spawn(process.execPath, [join(PKG, "cli.mjs"), "--theme", "praxis-carbon", "--appearance", "light", "--no-contrast", "--off", "brand", "--modality", "chat", "--out", join(cwd, "audit-report"), "--fail-on", "never", `${base}/${page}`], { cwd });
  let stdout = "", stderr = "";
  c.stdout.on("data", (d) => { stdout += d; }); c.stderr.on("data", (d) => { stderr += d; });
  c.on("close", (status) => resolve({ status, stdout, stderr }));
});

describe("US-106: the audit writes a check event", () => {
  // @covers US-106-AC2
  test("AC2: each run records its status, its attempt, each rule found with its severity and count, the verdicts and the report", async () => {
    for (const page of ["ai-disclose.html", "clean-chat.html"]) {
      const r = await audit(app, page);
      assert.equal(r.status, 0, r.stderr);
    }
    const [ep] = listEpisodes(app);
    const checks = readEpisode(app, ep.id).filter((e) => e.kind === "check");
    assert.deepEqual(checks.map((c) => [c.check, c.attempt]), [["audit", 1], ["audit", 2]]);
    const report = JSON.parse(readFileSync(join(app, "audit-report/report.json"), "utf8"));
    const last = checks.at(-1);
    assert.deepEqual(last, { ...last, ...auditCheck(report, { out: join(app, "audit-report"), appDir: app }) });
    assert.equal(last.report, "audit-report/report.json");
    assert.deepEqual(last.verdicts, { theme: report.verdicts.theme.status, modality: report.verdicts.modality.map((v) => ({ modality: v.modality, status: v.status })) });
    assert.deepEqual(last.verdicts.modality.map((v) => v.modality), ["chat"]);
    // The seeded page's run found ai.disclose; the count per rule and severity is the report's.
    const first = checks[0];
    const disclose = first.findings.find((f) => f.ruleId === "ai.disclose");
    assert.ok(disclose && disclose.count >= 1, JSON.stringify(first.findings));
    assert.equal(first.status, first.findings.some((f) => f.severity === "error") ? "fail" : "warn");
    for (const c of checks) {
      assert.deepEqual(validateEvent(c), []);
      assert.equal(c.by, `@ux-builder/audit@${JSON.parse(readFileSync(join(PKG, "package.json"), "utf8")).version}`);
      for (const f of c.findings) assert.deepEqual(Object.keys(f).sort(), ["count", "ruleId", "severity"], "IDs and counts, never a selector or message");
    }
  });

  test("outside an app that keeps a trace, the audit writes none", async () => {
    const r = await audit(outside, "clean-chat.html");
    assert.equal(r.status, 0, r.stderr);
    assert.equal(existsSync(join(outside, ".ux-builder")), false);
  });

  test("auditCheck: status from the summary, findings by rule ID (else the check), verdicts", () => {
    const fields = auditCheck({ summary: { error: 0, warning: 1 }, findings: [{ check: "reflow", ruleId: null, severity: "warning" }, { check: "token-colors", ruleId: "theme.tokens", severity: "info" }, { check: "token-colors", ruleId: "theme.tokens", severity: "info" }], verdicts: { theme: { status: "pass" }, modality: [{ modality: "responsive-web", status: "warn", components: [] }] } });
    assert.deepEqual(fields, { status: "warn", findings: [{ ruleId: "reflow", severity: "warning", count: 1 }, { ruleId: "theme.tokens", severity: "info", count: 2 }], report: null, verdicts: { theme: "pass", modality: [{ modality: "responsive-web", status: "warn" }] } });
  });
});
