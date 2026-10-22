/* The audit in the app's episode trace (FEAT-016 TRC-03, US-106-AC2;
   CONTRACT-007): each run of ux-builder-audit writes a `check` event, when
   @ux-builder/trace is installed and the app keeps a trace (a .ux-builder/
   folder at or above the working directory). Nothing is written otherwise,
   and a trace that cannot be written never fails the audit. */

import { readFileSync, realpathSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";

const VERSION = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")).version;

/* The check event's fields for a report: its status (fail on an error, warn
   on a warning), each rule's findings (the interaction rule's ID, else the
   audit check's name), the verdicts, and the report's path in the app. */
export function auditCheck(report, { out, appDir } = {}) {
  const s = report.summary ?? {};
  const status = s.error ? "fail" : s.warning ? "warn" : "pass";
  const by = new Map();
  for (const f of report.findings ?? []) {
    const ruleId = f.ruleId ?? f.check ?? f.rule ?? "audit";
    const key = `${ruleId}\u0000${f.severity}`;
    const e = by.get(key) ?? { ruleId, severity: f.severity, count: 0 };
    e.count++;
    by.set(key, e);
  }
  const findings = [...by.values()].sort((a, b) => a.ruleId.localeCompare(b.ruleId) || a.severity.localeCompare(b.severity));
  const v = report.verdicts;
  const verdicts = v?.theme ? { theme: String(v.theme.status), modality: (v.modality ?? []).map((m) => ({ modality: String(m.modality), status: String(m.status) })) } : undefined;
  // Real paths (/var and /private/var are one folder on macOS), from the nearest folder that exists.
  const real = (p) => { try { return realpathSync(p); } catch { const up = dirname(p); return up === p ? p : join(real(up), basename(p)); } };
  const at = out ? join(real(resolve(out)), "report.json") : null;
  const rel = at && appDir ? relative(real(appDir), at) : at;
  return { status, findings, report: rel, ...(verdicts ? { verdicts } : {}) };
}

/* Write the check event; returns it, or null when there is no trace to write to. */
export async function recordAudit(report, { out, start = process.cwd() } = {}) {
  let trace;
  try { trace = await import("@ux-builder/trace"); } catch { return null; }
  const appDir = trace.findApp(start);
  if (!appDir) return null;
  return trace.recordCheck(appDir, "audit", auditCheck(report, { out, appDir }), { by: `@ux-builder/audit@${VERSION}` });
}
