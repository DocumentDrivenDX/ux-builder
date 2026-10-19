#!/usr/bin/env node
/* Every acceptance criterion is exercised by a test that says so (HELIX
   traceability).

     npm run coverage

   Lists every criterion ID (US-<n>-AC<m>) in docs/helix/01-frame/user-stories/,
   finds "@covers <ID>" citations in tests and checks (anywhere under tools/,
   packages/ and apps/), and fails on a criterion with none, unless
   tools/coverage-exceptions.json lists it with a reason (a criterion checked
   by review or by an on-demand run rather than in CI). An exception for a
   criterion that is now cited, or that no longer exists, also fails, so the
   list only shrinks. */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const STORIES = join(ROOT, "docs/helix/01-frame/user-stories");
const SEARCH = ["tools", "packages", "apps"];
const SKIP = new Set(["node_modules", "dist", "fixtures", "storybook-static", "test-results", "build"]);

export function criteria() {
  const out = new Map();
  for (const f of readdirSync(STORIES).filter((x) => x.endsWith(".md")).sort()) {
    for (const [, id, text] of readFileSync(join(STORIES, f), "utf8").matchAll(/\*\*(US-\d+-AC\d+)\*\* — (.*)/g)) out.set(id, { story: f, text });
  }
  return out;
}

export function citations() {
  const out = new Map();
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (SKIP.has(e.name) || e.name.startsWith(".")) continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (!/\.(m?js|jsx)$/.test(e.name)) continue;
      const text = readFileSync(p, "utf8");
      // One criterion per tag, the pattern HELIX's align check reads.
      for (const [, id] of text.matchAll(/@covers\s+(US-\d+-AC\d+)/g)) {
        if (!out.has(id)) out.set(id, new Set());
        out.get(id).add(relative(ROOT, p));
      }
    }
  };
  for (const d of SEARCH) if (existsSync(join(ROOT, d))) walk(join(ROOT, d));
  return out;
}

export function report() {
  const acs = criteria(), cited = citations();
  const exceptions = JSON.parse(readFileSync(join(ROOT, "tools/coverage-exceptions.json"), "utf8")).exceptions;
  const excepted = new Map(exceptions.map((e) => [e.id, e]));
  const problems = [];
  for (const [id, { story }] of acs) if (!cited.has(id) && !excepted.has(id)) problems.push(`UNCOVERED  ${id} (${story}): no test cites it`);
  for (const e of exceptions) {
    if (!String(e.reason ?? "").trim()) problems.push(`EXCEPTION  ${e.id}: no reason given`);
    if (!acs.has(e.id)) problems.push(`EXCEPTION  ${e.id}: no such criterion; remove it from tools/coverage-exceptions.json`);
    else if (cited.has(e.id)) problems.push(`EXCEPTION  ${e.id}: now cited by ${[...cited.get(e.id)].join(", ")}; remove it from tools/coverage-exceptions.json`);
  }
  for (const id of cited.keys()) if (!acs.has(id)) problems.push(`STRAY      ${id}: cited by ${[...cited.get(id)].join(", ")}, but no story defines it`);
  return { total: acs.size, cited: [...acs.keys()].filter((id) => cited.has(id)).length, excepted: exceptions.length, problems };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = report();
  for (const p of r.problems) console.log(p);
  console.log(`\n${r.total} acceptance criteria: ${r.cited} cited by tests, ${r.excepted} excepted with a reason.`);
  if (r.problems.length) process.exit(1);
}
