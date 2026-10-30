/* US-163-AC6: ux-builder-visuals renders a batch in one process. */

import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { main } from "../cli.mjs";
import { fixtures } from "./helpers.mjs";

const file = (id) => fixtures.find((f) => f.id === id).file;

test("@covers US-163-AC6 one run renders several documents, checks them and exits 0", async () => {
  const out = mkdtempSync(join(tmpdir(), "uxb-visuals-"));
  try {
    const r = await main(["render", file("helix-context"), file("beacon-reply-draft"), file("beacon-field-guide"), "--theme", "databricks", "--appearance", "both", "--output", "all", "--out", out, "--check", "--report"]);
    assert.equal(r.code, 0, r.stdout + r.stderr);
    const summary = JSON.parse(r.stdout);
    assert.deepEqual(summary.rendered.map((x) => x.id), ["helix-context", "beacon-reply-draft", "beacon-field-guide"]);
    assert.deepEqual(summary.refused, []);
    for (const ext of ["svg", "mmd", "plate.html", "presentation.html", "layout.json"]) assert.ok(existsSync(join(out, `beacon-field-guide.${ext}`)), ext);
    assert.ok(!existsSync(join(out, "helix-context.presentation.html")), "no presentation without steps");
    assert.match(readFileSync(join(out, "helix-context.svg"), "utf8"), /var\(--piq-color-ground, #/);
  } finally { rmSync(out, { recursive: true, force: true }); }
});

test("@covers US-163-AC6 a refused document makes the run exit 1 and is named in the summary", async () => {
  const out = mkdtempSync(join(tmpdir(), "uxb-visuals-"));
  try {
    const bad = join(out, "bad.json");
    const doc = JSON.parse(readFileSync(file("helix-context"), "utf8"));
    doc.extensions["umf.visual"].id = "helix-context-broken";
    doc.extensions["umf.visual"].edges[0].to = "nowhere";
    writeFileSync(bad, JSON.stringify(doc));
    const r = await main(["render", file("helix-context"), bad, "--theme", "praxis", "--out", out]);
    assert.equal(r.code, 1);
    const summary = JSON.parse(r.stdout);
    assert.equal(summary.rendered.length, 1);
    assert.equal(summary.refused[0].code, "VISUAL_INVALID");
    assert.equal(summary.refused[0].diagnostics[0].code, "VISUAL_REFERENCE");
  } finally { rmSync(out, { recursive: true, force: true }); }
});

test("@covers US-163-AC6 usage without a theme or documents", async () => {
  const r = await main(["render", "--theme", "praxis"]);
  assert.equal(r.code, 2);
  assert.match(r.stderr, /usage: ux-builder-visuals render/);
});
