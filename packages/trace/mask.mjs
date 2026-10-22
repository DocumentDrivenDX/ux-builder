/* Masking (CONTRACT-007 Masking, US-108-AC4).

   Before a transcript or an event is written, and again on export, these are
   replaced by [masked:<kind>]:
     - strings that look like keys or tokens: the assessment's patterns
       (packages/audit/assess/manifest.mjs SECRETS, restated here so this
       package does not depend on the audit) plus sk-, ghp_, npm_, AKIA and
       JWT shapes;
     - values from the app's .env* files (8 characters or more, so "true" or
       "3000" are not masked everywhere);
     - the app's .ux-builder/config.json redact.text patterns;
     - its assessment manifest's (ux-assessment.yml) evidence.redact.text
       patterns (CONTRACT-006). */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import YAML from "yaml";

/* [kind, global RegExp], most specific first. */
export const SECRET_PATTERNS = [
  ["private-key", /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g],
  ["api-key", /\bsk-[A-Za-z0-9_-]{16,}/g],
  ["github-token", /\bgh[pousr]_[A-Za-z0-9]{20,}|\bgithub_pat_[A-Za-z0-9_]{22,}/g],
  ["npm-token", /\bnpm_[A-Za-z0-9]{30,}/g],
  ["slack-token", /\bxox[abprs]-[A-Za-z0-9-]{10,}/g],
  ["aws-key", /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g],
  ["jwt", /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g],
  ["authorization", /\b(?:Bearer|Basic)\s+(?=[A-Za-z0-9._~+/=-]*\d)[A-Za-z0-9._~+/=-]{16,}/g],
];

export const MIN_ENV_VALUE = 8;
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* Values of the app's .env, .env.local, .env.production … files. */
export function envValues(appDir) {
  let names = [];
  try { names = readdirSync(appDir).filter((n) => /^\.env(\..+)?$/.test(n)); } catch { return []; }
  const values = new Set();
  for (const n of names) {
    let text = "";
    try { text = readFileSync(join(appDir, n), "utf8"); } catch { continue; }
    for (const line of text.split(/\r?\n/)) {
      const m = /^\s*(?:export\s+)?[A-Za-z_][A-Za-z0-9_.-]*\s*=\s*(.*)$/.exec(line);
      if (!m) continue;
      let v = m[1].trim();
      if (/^(["']).*\1$/.test(v)) v = v.slice(1, -1);
      else v = v.replace(/\s+#.*$/, "").trim();
      if (v.length >= MIN_ENV_VALUE) values.add(v);
    }
  }
  return [...values].sort((a, b) => b.length - a.length);
}

/* The app's own redaction patterns: config.json redact.text and the manifest's evidence.redact.text. */
export function redactPatterns(appDir) {
  const out = [];
  try {
    const c = JSON.parse(readFileSync(join(appDir, ".ux-builder/config.json"), "utf8"));
    for (const t of c?.redact?.text ?? []) if (typeof t === "string") out.push(t);
  } catch { /* no config, or not JSON: no patterns */ }
  for (const f of ["ux-assessment.yml", "ux-assessment.yaml"]) {
    if (!existsSync(join(appDir, f))) continue;
    try {
      const m = YAML.parse(readFileSync(join(appDir, f), "utf8"));
      for (const t of m?.evidence?.redact?.text ?? []) if (typeof t === "string") out.push(t);
    } catch { /* an unreadable manifest masks nothing more */ }
  }
  return out;
}

/* The rules for an app, compiled once per call site: [kind, RegExp][]. */
export function rulesFor(appDir) {
  const rules = SECRET_PATTERNS.map(([k, re]) => [k, new RegExp(re.source, re.flags)]);
  if (appDir) {
    const env = envValues(appDir);
    if (env.length) rules.push(["env", new RegExp(env.map(escape).join("|"), "g")]);
    for (const p of redactPatterns(appDir)) {
      try { rules.push(["redact", new RegExp(p, "g")]); } catch { /* an invalid pattern is skipped */ }
    }
  }
  return rules;
}

/* mask(text, { appDir }) → { text, count, kinds: { kind: count } }. */
export function mask(text, { appDir, rules } = {}) {
  let t = String(text ?? "");
  let count = 0;
  const kinds = {};
  for (const [kind, re] of rules ?? rulesFor(appDir)) {
    re.lastIndex = 0;
    t = t.replace(re, (m) => {
      if (!m) return m;
      count++;
      kinds[kind] = (kinds[kind] ?? 0) + 1;
      return `[masked:${kind}]`;
    });
  }
  return { text: t, count, kinds };
}

/* Every string in a JSON value masked; returns { value, count }. */
export function maskValue(value, rules) {
  let count = 0;
  const walk = (v) => {
    if (typeof v === "string") { const r = mask(v, { rules }); count += r.count; return r.text; }
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return { value: walk(value), count };
}

/* Where secrets are left in a text: [{ line, kind }], 1-based lines. */
export function findSecrets(text, { appDir, rules } = {}) {
  const hits = [];
  const lines = String(text).split("\n");
  const rs = rules ?? rulesFor(appDir);
  lines.forEach((l, i) => {
    for (const [kind, re] of rs) {
      re.lastIndex = 0;
      if (re.test(l)) hits.push({ line: i + 1, kind });
      re.lastIndex = 0;
    }
  });
  return hits;
}

/* How many [masked:…] markers a text already holds. */
export const maskedCount = (text) => (String(text).match(/\[masked:[a-z-]+\]/g) ?? []).length;
