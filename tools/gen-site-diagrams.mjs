#!/usr/bin/env node
/* The microsite's flow diagram and wireframes (Concepts / Flows and
   journeys, SD-002), drawn from a sample blueprint by the SDK's own
   `ux-builder-blueprint draw` and `wireframes` code, and checked in beside
   the blueprint so the site needs no browser to build.

     npm run build                                # wireframes use @ux-builder/ui's dist
     node tools/gen-site-diagrams.mjs             # rewrite the files
     node tools/gen-site-diagrams.mjs --check     # exit 1 if any is stale

   The check compares the flow's SVG and Mermaid and the wireframes' HTML
   with a fresh run, byte for byte (tools/__tests__/built/site-diagrams.test.mjs).
   The PNGs are screenshots of that HTML; they are rewritten, not compared,
   since Chromium's text rendering differs between machines. */

import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { drawings } from "../packages/ui/blueprint/draw.mjs";
import { wireframes, writeWireframes } from "../packages/ui/blueprint/wireframes.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
export const DIR = join(ROOT, "apps/theme-builder/src/microsite/diagrams");
export const BLUEPRINT = join(DIR, "review.blueprint.json");
/* The two wireframes the page shows: the queue on a phone, the entry on a wide screen. */
export const SHOWN = ["queue.compact.html", "entry.expanded.html"];

/* Every compared file's expected content, from a fresh run: { name: text }. */
export async function expected() {
  const bp = JSON.parse(readFileSync(BLUEPRINT, "utf8"));
  const flow = drawings(bp).find((d) => d.name === "flow");
  const pages = (await wireframes(bp)).filter((p) => SHOWN.includes(p.file));
  return { pages, files: { "flow.svg": flow.svg, "flow.mmd": flow.mermaid, ...Object.fromEntries(pages.map((p) => [p.file, p.html])) } };
}

/* The names of the checked-in files that differ from a fresh run. */
export async function stale() {
  const { files } = await expected();
  return Object.entries(files).filter(([name, text]) => !existsSync(join(DIR, name)) || readFileSync(join(DIR, name), "utf8") !== text).map(([name]) => name);
}

async function write() {
  const { pages, files } = await expected();
  for (const [name, text] of Object.entries(files)) writeFileSync(join(DIR, name), text);
  const tmp = mkdtempSync(join(tmpdir(), "site-wireframes-"));
  try {
    const w = await writeWireframes(pages, tmp);
    if (!w.png) { console.error(w.reason); process.exitCode = 1; return; }
    for (const p of pages) copyFileSync(join(tmp, p.file.replace(/\.html$/, ".png")), join(DIR, p.file.replace(/\.html$/, ".png")));
  } finally { rmSync(tmp, { recursive: true, force: true }); }
  console.log(`gen-site-diagrams: wrote ${[...Object.keys(files), ...SHOWN.map((f) => f.replace(/\.html$/, ".png"))].join(", ")} in ${DIR}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv.includes("--check")) {
    const out = await stale();
    if (out.length) { console.error(`gen-site-diagrams: stale ${out.join(", ")}; run node tools/gen-site-diagrams.mjs`); process.exitCode = 1; }
    else console.log("gen-site-diagrams: up to date");
  } else await write();
}
