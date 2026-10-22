/* A wireframe from the blueprint passes its pattern's own audit checks
   (FEAT-012 DRW-02; US-090-AC3; ADR-030 decision 6): the review blueprint's
   wireframes, written by ux-builder-blueprint wireframes, audited like the
   screen patterns in patterns.test.mjs, in their plain theme, at each size
   class they were drawn at.

     npm run build && npm test --workspace @ux-builder/audit */

import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, join, normalize } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { audit } from "../audit.mjs";

const ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const UI = join(ROOT, "packages/ui");
const out = mkdtempSync(join(tmpdir(), "wireframes-"));
let server, base, pages;

before(async () => {
  const { wireframes, writeWireframes } = await import(pathToFileURL(join(UI, "blueprint/wireframes.mjs")).href);
  pages = await wireframes(JSON.parse(readFileSync(join(UI, "test/fixtures/review.blueprint.json"), "utf8")));
  await writeWireframes(pages, out);
  server = createServer((req, res) => {
    const file = normalize(join(out, decodeURIComponent(new URL(req.url, "http://x").pathname)));
    if (!file.startsWith(out) || !existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "content-type": { ".html": "text/html", ".css": "text/css", ".png": "image/png" }[extname(file)] ?? "application/octet-stream" });
    res.end(readFileSync(file));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server?.close(); rmSync(out, { recursive: true, force: true }); });

// As patterns.test.mjs: no error, and none of the layout checks (reflow, targets, focus).
const problems = (r) => r.findings.filter((f) => f.severity === "error" || ["reflow", "target-size", "focus-obscured", "one-primary-action", "nav-per-breakpoint", "modal-contract", "one-modal"].includes(f.check));
const show = (fs) => JSON.stringify(fs.map((f) => `${f.check} ${f.selector ?? ""} ${f.message} [${f.runs.join(" ")}]`), null, 1);

describe("US-090-AC3: a wireframe passes its pattern's audit checks", () => {
  // @covers US-090-AC3
  test("each known pattern's wireframe, at the width of the size class it was drawn for, in the plain theme", async () => {
    const known = pages.filter((p) => p.known);
    assert.deepEqual([...new Set(known.map((p) => p.pattern))], ["WorkQueue", "RecordDetail", "CollectionList", "FormPage", "SettingsPage"]);
    for (const width of [...new Set(known.map((p) => p.width))]) {
      const urls = known.filter((p) => p.width === width).map((p) => `${base}/${p.file}`);
      const r = await audit({ urls, themes: ["plain"], appearances: ["light"], widths: [width] });
      assert.deepEqual([...new Set(r.runs.map((x) => `${x.theme}/${x.appearance}@${x.width}`))], [`plain/light@${width}`]);
      assert.deepEqual(problems(r), [], show(problems(r)));
    }
  });
});
