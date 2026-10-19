#!/usr/bin/env node
/* The third-party licence check (ADR-023 rule 7, FEAT-007 LIC-01 to LIC-04,
   US-049). For every published SDK package (packages/*, not private) it reads
   the production, peer and optional dependency tree as installed, and the
   package's licenses/vendored.json, and fails when:

   - a third-party package's licence is not on the allow-list, or is unknown,
     missing or "SEE LICENSE IN", unless licenses/exceptions.json lists it;
   - a package's licence field and its LICENSE file disagree;
   - vendored source has lost its notice, a changed file is not marked, or
     the licence text (or NOTICE) is not shipped;
   - a shipped dependency is a known telemetry package, or runs an install
     script (where install analytics run), unless an exception allows the
     script; the operator decided no telemetry, 2026-10-19;
   - an SDK package declares no licence of its own;
   - a package's THIRD-PARTY-NOTICES.md is missing or out of date.

   An exception approved by counsel passes; one awaiting counsel warns until
   its review date and fails after it. Development-only dependencies are not
   shipped, so they are counted, not checked.

     node tools/check-licences.mjs           check (npm run check runs this)
     node tools/check-licences.mjs --write   also rewrite THIRD-PARTY-NOTICES.md */

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

export const ALLOWED = ["MIT", "Apache-2.0", "ISC", "BSD-2-Clause", "BSD-3-Clause", "0BSD", "CC0-1.0"];
/* Packages that report usage, never allowed in what the SDK ships, whatever their licence. In the
   repository's own development tree they are allowed only where every CI workflow sets their off switch. */
export const TELEMETRY = {
  "@scarf/scarf": { what: "Scarf install analytics", off: { SCARF_ANALYTICS: "false" } },
  "@ibm/telemetry-js": { what: "IBM install telemetry (run by @carbon/icons on CI)", off: { IBM_TELEMETRY_DISABLED: "true" } },
};
const INSTALL_HOOKS = ["preinstall", "install", "postinstall"];
const NOTICES = "THIRD-PARTY-NOTICES.md";
const DAY = 86_400_000;

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

/* The licence a package.json declares, as an SPDX expression, or null. */
export function declared(pkg) {
  const l = pkg.license ?? pkg.licence;
  if (typeof l === "string") return l.trim() || null;
  if (l && typeof l.type === "string") return l.type;
  if (Array.isArray(pkg.licenses) && pkg.licenses.length) return pkg.licenses.map((x) => (typeof x === "string" ? x : x.type)).join(" OR ");
  return null;
}

/* An SPDX expression's licence ids, and the choice that satisfies the allow-list (null when none does). */
export function evaluate(expr, allowed = ALLOWED) {
  const tokens = expr.replace(/[()]/g, " $& ").trim().split(/\s+/);
  let i = 0;
  const ids = [];
  function primary() {
    if (tokens[i] === "(") { i++; const v = or(); i++; return v; }
    let id = tokens[i++];
    if (tokens[i] === "WITH") i += 2;           // an exception to a licence keeps its base licence's terms
    id = id?.replace(/\+$/, "");
    ids.push(id);
    return allowed.includes(id) ? [id] : null;
  }
  function and() {
    let v = primary();
    while (tokens[i] === "AND") { i++; const r = primary(); v = v && r ? [...v, ...r] : null; }
    return v;
  }
  function or() {
    let v = and();
    while (tokens[i] === "OR") { i++; const r = and(); v = v ?? r; }
    return v;
  }
  if (/^SEE LICEN[CS]E IN/i.test(expr) || /^UNLICENSED$/i.test(expr)) return { ids: [expr], choice: null };
  const choice = or();
  return { ids, choice };
}

/* What a licence file's text says it is, from the opening of the text; null when unrecognised. */
export function classify(text) {
  const t = text.slice(0, 3000).replace(/\s+/g, " ");
  if (/GNU AFFERO GENERAL PUBLIC LICENSE/i.test(t)) return "AGPL";
  if (/GNU LESSER GENERAL PUBLIC LICENSE/i.test(t)) return "LGPL";
  if (/GNU GENERAL PUBLIC LICENSE/i.test(t)) return "GPL";
  if (/Mozilla Public License/i.test(t)) return "MPL-2.0";
  if (/Server Side Public License/i.test(t)) return "SSPL";
  if (/Business Source License/i.test(t)) return "BUSL";
  if (/Apache License,? Version 2\.0|Apache License\s+Version 2\.0/i.test(t)) return "Apache-2.0";
  if (/Permission is hereby granted, free of charge/i.test(t)) return "MIT";
  if (/Permission to use, copy, modify, and\/or distribute this software for any purpose with or without fee is hereby granted/i.test(t)) {
    return /provided that the above copyright notice and this permission notice appear in all copies/i.test(t) ? "ISC" : "0BSD";
  }
  if (/Redistribution and use in source and binary forms/i.test(t)) return /Neither the name/i.test(t) ? "BSD-3-Clause" : "BSD-2-Clause";
  if (/CC0 1\.0 Universal/i.test(t)) return "CC0-1.0";
  return null;
}

/* Families that count as the same licence when comparing a file to its field. */
const FAMILY = { GPL: /^GPL/, LGPL: /^LGPL/, AGPL: /^AGPL/, SSPL: /^SSPL/, BUSL: /^BUSL/ };
function fileAgrees(kind, ids) {
  if (!kind) return true;
  if (FAMILY[kind]) return ids.some((id) => FAMILY[kind].test(id));
  if (kind === "BSD-2-Clause" || kind === "BSD-3-Clause") return ids.some((id) => /^BSD-[23]-Clause/.test(id) || id === "BSD");
  if (kind === "ISC" || kind === "0BSD") return ids.some((id) => id === "ISC" || id === "0BSD");
  return ids.includes(kind);
}

function licenceFile(dir) {
  let names;
  try { names = readdirSync(dir); } catch { return null; }
  const f = names.find((n) => /^(LICEN[CS]E|COPYING)(\.|-|$)/i.test(n));
  return f ? join(dir, f) : null;
}

/* Where a package resolves from a directory, by Node's rules (nearest node_modules up to the root). */
function resolveFrom(name, fromDir, root) {
  for (let d = fromDir; ; d = dirname(d)) {
    const p = join(d, "node_modules", name, "package.json");
    if (existsSync(p)) return dirname(p);
    if (d === root || d === dirname(d)) return null;
  }
}

/* Every published SDK package with its shipped third-party tree. */
export function scan(root, { now = new Date() } = {}) {
  const pkgsDir = join(root, "packages");
  const own = readdirSync(pkgsDir).map((d) => join(pkgsDir, d)).filter((d) => existsSync(join(d, "package.json")));
  const ownNames = new Set(own.map((d) => readJson(join(d, "package.json")).name));
  const exceptions = existsSync(join(root, "licenses/exceptions.json")) ? readJson(join(root, "licenses/exceptions.json")).exceptions : [];
  const errors = [], warnings = [], packages = [];

  for (const dir of own) {
    const pkg = readJson(join(dir, "package.json"));
    if (pkg.private) continue;
    const at = relative(root, dir);
    if (!declared(pkg)) errors.push(`${pkg.name} (${at}) declares no licence of its own: add a "license" field`);

    // The installed tree of what the package ships with: dependencies, peers and optional ones.
    const third = new Map();
    const queue = [];
    const enqueue = (deps, from) => { for (const n of Object.keys(deps ?? {})) queue.push([n, from]); };
    enqueue({ ...pkg.dependencies, ...pkg.peerDependencies, ...pkg.optionalDependencies }, dir);
    const missing = [];
    while (queue.length) {
      const [name, from] = queue.shift();
      if (ownNames.has(name)) continue;               // the SDK's own packages are checked as themselves
      const where = resolveFrom(name, from, root);
      if (!where) { if (!(pkg.peerDependenciesMeta?.[name]?.optional) && !(pkg.optionalDependencies?.[name])) missing.push(name); continue; }
      const dep = readJson(join(where, "package.json"));
      const key = `${dep.name}@${dep.version}`;
      if (third.has(key)) continue;
      third.set(key, { name: dep.name, version: dep.version, dir: where, pkg: dep });
      enqueue({ ...dep.dependencies, ...dep.optionalDependencies }, where);
      enqueue(Object.fromEntries(Object.keys(dep.peerDependencies ?? {}).filter((n) => !dep.peerDependenciesMeta?.[n]?.optional).map((n) => [n, "*"])), where);
    }
    for (const m of missing) warnings.push(`${pkg.name}: ${m} is not installed, so its licence was not read`);

    const entries = [];
    for (const d of [...third.values()].sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version))) {
      const expr = declared(d.pkg);
      const file = licenceFile(d.dir);
      const kind = file ? classify(readFileSync(file, "utf8")) : null;
      const label = `${d.name}@${d.version}`;
      const ex = exceptions.find((e) => e.name === d.name && (!e.version || e.version === d.version));
      let licence = expr ?? "(none declared)", choice = null, problem = null;
      if (!expr) problem = "declares no licence";
      else {
        const r = evaluate(expr);
        choice = r.choice && r.choice.join(" AND ");
        if (!choice) problem = `is licensed ${expr}, which is not on the allow-list`;
        else if (!fileAgrees(kind, r.ids)) problem = `declares ${expr} but its ${relative(d.dir, file)} reads as ${kind}`;
      }
      if (problem && ex) {
        const review = ex.reviewBy ? new Date(ex.reviewBy) : null;
        if (ex.approvedBy && ex.approved) choice = `exception approved by ${ex.approvedBy}, ${ex.approved}`;
        else if (review && now <= review) { warnings.push(`${pkg.name}: ${label} ${problem}; awaiting counsel until ${ex.reviewBy} (licenses/exceptions.json)`); choice = `exception awaiting counsel until ${ex.reviewBy}`; }
        else errors.push(`${pkg.name}: ${label} ${problem}; its exception's review date ${ex.reviewBy ?? "(none)"} has passed without counsel's approval`);
        problem = null;
      }
      if (problem) errors.push(`${pkg.name}: ${label} ${problem}; ask counsel for an exception (licenses/exceptions.json)`);
      if (TELEMETRY[d.name]) errors.push(`${pkg.name}: ${label} is ${TELEMETRY[d.name].what}, which reports usage; the SDK ships no telemetry`);
      const hooks = INSTALL_HOOKS.filter((h) => d.pkg.scripts?.[h]);
      if (hooks.length && !ex?.installScript) errors.push(`${pkg.name}: ${label} runs an install script (${hooks.map((h) => `${h}: ${d.pkg.scripts[h]}`).join("; ")}); install scripts can report usage, so it needs an exception saying why it is safe`);
      if (ex?.approvedBy && ex.reviewBy && now > new Date(ex.reviewBy)) {
        const late = Math.floor((now - new Date(ex.reviewBy)) / DAY);
        (late > 30 ? errors : warnings).push(`${pkg.name}: the exception for ${label} was due for review on ${ex.reviewBy}`);
      }
      entries.push({ name: d.name, version: d.version, licence, choice, repository: repoOf(d.pkg) });
    }

    // Vendored third-party source (rule 6).
    const vendored = [];
    const vfile = join(dir, "licenses/vendored.json");
    if (existsSync(vfile)) {
      for (const v of readJson(vfile).vendored ?? []) {
        const what = `${pkg.name}: vendored ${v.name}`;
        const r = evaluate(v.licence ?? "");
        if (!r.choice) errors.push(`${what} is licensed ${v.licence ?? "(none)"}, which is not on the allow-list`);
        if (!v.licenceFile || !existsSync(join(dir, v.licenceFile))) errors.push(`${what}: its licence text ${v.licenceFile ?? "(not given)"} is not in the package`);
        if (v.noticeFile && !existsSync(join(dir, v.noticeFile))) errors.push(`${what}: its NOTICE file ${v.noticeFile} is not in the package`);
        const shipped = (f) => (pkg.files ?? []).some((g) => f === g || f.startsWith(`${g.replace(/\/$/, "")}/`));
        if (v.shipped !== false && v.licenceFile && pkg.files && !shipped(v.licenceFile)) errors.push(`${what}: ${v.licenceFile} is not in package.json "files", so it does not ship`);
        for (const f of v.files ?? []) {
          const p = join(dir, f);
          if (!existsSync(p)) { errors.push(`${what}: ${f} is listed but missing`); continue; }
          const text = readFileSync(p, "utf8");
          if (v.notice && !text.includes(v.notice)) errors.push(`${what}: ${f} has lost its notice ("${v.notice}")`);
        }
        const mark = v.changeNotice ?? "Changed by";
        for (const f of v.changed ?? []) {
          if (!(v.files ?? []).includes(f)) { errors.push(`${what}: changed file ${f} is not in its files`); continue; }
          if (existsSync(join(dir, f)) && !readFileSync(join(dir, f), "utf8").includes(mark)) errors.push(`${what}: ${f} is changed but does not say so ("${mark}")`);
        }
        if (v.shipped !== false) vendored.push(v);
      }
    }

    const notices = noticesFor(pkg, entries, vendored);
    const path = join(dir, NOTICES);
    packages.push({ name: pkg.name, dir, at, licence: declared(pkg), third: entries, vendored, notices, noticesPath: path });
    if (!(pkg.files ?? [NOTICES]).includes(NOTICES) && pkg.files) errors.push(`${pkg.name}: ${NOTICES} is not in package.json "files", so it does not ship`);
  }
  errors.push(...devTelemetry(root));
  return { packages, errors, warnings };
}

/* Telemetry packages anywhere in the installed tree (development tools included): each must be
   switched off in every CI workflow, at the top level, where every job and install inherits it. */
export function devTelemetry(root) {
  const found = new Map();
  const walk = (dir, depth) => {
    let names;
    try { names = readdirSync(dir); } catch { return; }
    for (const n of names) {
      if (n.startsWith(".")) continue;
      const p = join(dir, n);
      if (n.startsWith("@")) { walk(p, depth); continue; }
      const pj = join(p, "package.json");
      if (existsSync(pj)) { try { const j = readJson(pj); if (TELEMETRY[j.name]) found.set(j.name, relative(root, p)); } catch { /* not a package */ } }
      if (depth < 4) walk(join(p, "node_modules"), depth + 1);
    }
  };
  walk(join(root, "node_modules"), 0);
  if (!found.size) return [];
  const wf = join(root, ".github/workflows");
  const workflows = existsSync(wf) ? readdirSync(wf).filter((f) => /\.ya?ml$/.test(f)) : [];
  const errors = [];
  for (const [name, at] of found) {
    for (const [k, v] of Object.entries(TELEMETRY[name].off)) {
      for (const f of workflows) {
        const text = readFileSync(join(wf, f), "utf8");
        const top = text.split(/\njobs:/)[0];
        if (!new RegExp(`^env:[\\s\\S]*^\\s+${k}:\\s*["']?${v}["']?\\s*$`, "m").test(top)) errors.push(`${at} is ${TELEMETRY[name].what}; .github/workflows/${f} must set ${k}: "${v}" in its top-level env`);
      }
    }
  }
  return errors;
}

const repoOf = (p) => (typeof p.repository === "string" ? p.repository : p.repository?.url ?? p.homepage ?? "").replace(/^git\+/, "").replace(/\.git$/, "");

export function noticesFor(pkg, entries, vendored) {
  const lines = [
    `# Third-party notices: ${pkg.name}`,
    "",
    "Generated by tools/check-licences.mjs; do not edit. The licence of each package below is in that",
    "package as installed; the licence texts of vendored source are in this package's licenses/ folder.",
    "",
  ];
  if (vendored.length) {
    lines.push("## Vendored and generated source", "", "| Source | Version | Licence | Licence text | Files |", "|---|---|---|---|---|");
    for (const v of vendored) lines.push(`| ${v.name} (${v.source}) | ${v.version} | ${v.licence} | ${v.licenceFile} | ${(v.files ?? []).join(", ")} |`);
    lines.push("");
  }
  lines.push("## Dependencies", "");
  if (!entries.length) lines.push("None: this package depends on no third-party package.");
  else {
    lines.push("| Package | Version | Licence | Repository |", "|---|---|---|---|");
    for (const e of entries) lines.push(`| ${e.name} | ${e.version} | ${!e.choice || e.choice === e.licence ? e.licence : e.choice.startsWith("exception") ? `${e.licence} (${e.choice})` : `${e.licence} (used under ${e.choice})`} | ${e.repository} |`);
  }
  return lines.join("\n") + "\n";
}

/* Run as a script. */
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const root = process.env.LICENCE_ROOT ?? fileURLToPath(new URL("..", import.meta.url));
  const write = process.argv.includes("--write");
  const { packages, errors, warnings } = scan(root);
  for (const p of packages) {
    const current = existsSync(p.noticesPath) ? readFileSync(p.noticesPath, "utf8") : null;
    if (write) { if (current !== p.notices) writeFileSync(p.noticesPath, p.notices); }
    else if (current !== p.notices) errors.push(`${p.name}: ${relative(root, p.noticesPath)} is ${current === null ? "missing" : "out of date"}; run node tools/check-licences.mjs --write and commit it`);
  }
  for (const w of warnings) console.warn(`warn  ${w}`);
  for (const p of packages) console.log(`ok    ${p.name}: ${p.licence ?? "(no licence)"}; ${p.third.length} third-party packages, ${p.vendored.length} vendored sources`);
  if (errors.length) {
    for (const e of errors) console.error(`fail  ${e}`);
    console.error(`\n${errors.length} licence problem${errors.length > 1 ? "s" : ""}.`);
    process.exit(1);
  }
  console.log("\nEvery shipped licence is on the allow-list or approved, and every notice is in place.");
}
