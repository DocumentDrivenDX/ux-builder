/* Writing into HELIX's documents (ADR-042 decision 2, ADR-030 decision 5).
   ux-builder never writes under docs/helix/ itself: each change is a
   proposal the person applies (`ux-builder-design proposals`). A document
   keeps one pending patch, helix-proposals/helix/<path under the root>.patch,
   that holds every change proposed to it since it was last applied, so a
   second change builds on the first instead of conflicting with it. */

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";
import { DesignError, proposalsDir, writeInApp } from "./app.mjs";
import { helixRoot, parseDocument } from "./documents.mjs";
import { patchedText } from "./proposals.mjs";

const posix = (p) => p.split(sep).join("/");
const rootOf = (app) => helixRoot(app)?.replace(/\/$/, "") ?? null;

/* A unified diff turning before (null for a new file) into after at path. */
export function unifiedDiff(path, before, after) {
  const d = mkdtempSync(join(tmpdir(), "helix-"));
  try {
    writeFileSync(join(d, "a"), before ?? ""); writeFileSync(join(d, "b"), after);
    const out = spawnSync("diff", ["-u", before == null ? "/dev/null" : join(d, "a"), join(d, "b")], { encoding: "utf8" }).stdout;
    return out.replace(/^--- .*$/m, `--- ${before == null ? "/dev/null" : `a/${path}`}`).replace(/^\+\+\+ .*$/m, `+++ b/${path}`);
  } finally { rmSync(d, { recursive: true, force: true }); }
}

/* The HELIX root, or a DesignError saying why there is nowhere to write. */
export function requireHelix(app, what) {
  const root = rootOf(app);
  if (!root) throw new DesignError(`the app has no HELIX (.helix.yml): ${what} has no HELIX document to go in; run HELIX's frame first`);
  return root;
}

/* Every HELIX document on disk: [{ path, text, front }]. */
export function helixDocuments(app) {
  const root = rootOf(app);
  if (!root || !existsSync(join(app, root))) return [];
  const out = [];
  const walk = (d) => {
    for (const name of readdirSync(join(app, d)).sort()) {
      const rel = `${d}/${name}`;
      if (statSync(join(app, rel)).isDirectory()) { if (!["node_modules", ".git"].includes(name)) walk(rel); continue; }
      if (!name.endsWith(".md")) continue;
      const text = readFileSync(join(app, rel), "utf8");
      out.push({ path: rel, text, front: parseDocument(text).front });
    }
  };
  walk(root);
  return out;
}

/* The patch file holding a document's pending changes. */
const patchFor = (app, path) => `${proposalsDir(app)}/helix/${posix(relative(rootOf(app), path))}.patch`;

/* Every document a pending proposal creates: [{ path, text }]. */
export function proposedDocuments(app) {
  const root = rootOf(app);
  const dir = join(app, proposalsDir(app), "helix");
  if (!root || !existsSync(dir)) return [];
  const out = [];
  const walk = (d) => {
    for (const name of readdirSync(d).sort()) {
      const abs = join(d, name);
      if (statSync(abs).isDirectory()) { walk(abs); continue; }
      if (!name.endsWith(".patch")) continue;
      const path = `${root}/${posix(relative(dir, abs)).replace(/\.patch$/, "")}`;
      if (existsSync(join(app, path))) continue;
      const text = patchedText(null, readFileSync(abs, "utf8"));
      if (text) out.push({ path, text });
    }
  };
  walk(dir);
  return out;
}

/* A HELIX document as it will be once its pending changes are applied: { path, text, base, pending }. */
export function currentText(app, path) {
  const base = existsSync(join(app, path)) ? readFileSync(join(app, path), "utf8") : null;
  const patch = join(app, patchFor(app, path));
  if (!existsSync(patch)) return { path, text: base, base, pending: false };
  const text = patchedText(base, readFileSync(patch, "utf8"));
  if (text == null) throw new DesignError(`${patchFor(app, path)} no longer applies to ${path}: apply or remove it first (ux-builder-design proposals)`);
  return { path, text, base, pending: true };
}

/* Propose a change to one HELIX document: change(text or null) returns its
   next text. The document's single pending patch is rewritten from what is on
   disk to the result; a result equal to what is on disk removes it. */
export function proposeChange(app, path, change) {
  requireHelix(app, `a change to ${path}`);
  const cur = currentText(app, path);
  const next = change(cur.text);
  const file = patchFor(app, path);
  if (next === cur.base) { rmSync(join(app, file), { force: true }); return { path, patch: null, text: next }; }
  writeInApp(app, file, unifiedDiff(path, cur.base, next));
  return { path, patch: file, id: file.slice(proposalsDir(app).length + 1).replace(/\.patch$/, ""), text: next };
}

/* The first HELIX document of a type, on disk or proposed: { path, text } or null. */
export function documentOfType(app, type) {
  const onDisk = helixDocuments(app).find((d) => d.front?.ddx?.type === type);
  if (onDisk) return { path: onDisk.path, text: currentText(app, onDisk.path).text };
  return proposedDocuments(app).find((d) => parseDocument(d.text).front?.ddx?.type === type) ?? null;
}

/* The next free number for a HELIX ID prefix (ADR), counting proposed documents. */
export function nextNumber(app, prefix) {
  const ids = [...helixDocuments(app), ...proposedDocuments(app)].map((d) => String((d.front ?? parseDocument(d.text).front)?.ddx?.id ?? ""));
  const nums = ids.map((id) => new RegExp(`^${prefix}-(\\d+)$`).exec(id)?.[1]).filter(Boolean).map(Number);
  return Math.max(0, ...nums) + 1;
}

/* ------------------------------------------------------ section editing */

const headingRe = (level, heading) => new RegExp(`^${"#".repeat(level)} ${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "i");

/* A section's body under its heading (## or ###), or null. */
export function sectionOf(text, heading, level = 2) {
  const ls = String(text ?? "").split("\n");
  const h = ls.findIndex((l) => headingRe(level, heading).test(l));
  if (h < 0) return null;
  let end = h + 1;
  while (end < ls.length && !new RegExp(`^#{1,${level}} `).test(ls[end])) end++;
  return ls.slice(h + 1, end).join("\n").trim();
}

/* The text with a section's body set: replaced where the heading exists,
   otherwise added after the section `after` names (or `inside`'s end for a
   subsection), or at the end. */
export function setSection(text, heading, body, { level = 2, after = null, inside = null } = {}) {
  const ls = String(text ?? "").replace(/\n*$/, "").split("\n");
  const block = [`${"#".repeat(level)} ${heading}`, "", ...String(body).replace(/\n*$/, "").split("\n"), ""];
  const stop = (i, lv) => i < ls.length && !new RegExp(`^#{1,${lv}} `).test(ls[i]);
  const h = ls.findIndex((l) => headingRe(level, heading).test(l));
  if (h >= 0) {
    let end = h + 1;
    while (stop(end, level)) end++;
    ls.splice(h, end - h, ...block);
  } else {
    const anchor = after ?? inside;
    const lv = inside ? level - 1 : level;
    const a = anchor ? ls.findIndex((l) => headingRe(lv, anchor).test(l)) : -1;
    if (a >= 0) {
      let end = a + 1;
      while (stop(end, lv)) end++;
      while (end > a + 1 && ls[end - 1] === "") end--;
      ls.splice(end, 0, "", ...block.slice(0, -1));
    } else ls.push("", ...block.slice(0, -1));
  }
  return ls.join("\n").replace(/\n{3,}/g, "\n\n").replace(/\n*$/, "\n");
}

/* A Markdown table's rows under a heading: arrays of cells, header and rule left out. */
export function tableUnder(text, heading, level = 2) {
  const body = sectionOf(text, heading, level);
  if (body == null) return [];
  // Cells split on a pipe, not an escaped one (\|), which is the cell's own.
  const rows = body.split("\n").filter((l) => l.trim().startsWith("|")).map((l) => l.trim().replace(/^\|/, "").replace(/(?<!\\)\|$/, "").split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, "|")));
  return rows.slice(2).filter((r) => r.some(Boolean) && !r.every((c) => /^\[.*\]$/.test(c) || c === ""));
}

/* A table cell's text, safe inside a Markdown table. */
export const cell = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ").trim();

/* A slug for file names and keys. */
export const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "item";
