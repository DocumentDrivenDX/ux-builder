/* The IA map, flows and wireframes drawn from the blueprint (FEAT-012
   DRW-01, DRW-02; US-090; ADR-030 decision 6; CONTRACT-004 Flows and
   journeys). The wireframes' own audit is US-090-AC3, in
   packages/audit/test/wireframes.test.mjs.

     npm run build && npm test --workspace @ux-builder/ui */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { drawings } from "../blueprint/draw.mjs";
import { wireframes } from "../blueprint/wireframes.mjs";
import { BLUEPRINT } from "./helix-app.mjs";

const CLI = fileURLToPath(new URL("../blueprint/cli.mjs", import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), "bp-draw-"));
after(() => rmSync(tmp, { recursive: true, force: true }));
const bp = () => JSON.parse(readFileSync(BLUEPRINT, "utf8"));
const cli = (...args) => spawnSync(process.execPath, [CLI, ...args], { cwd: tmp, encoding: "utf8" });
const files = (dir) => Object.fromEntries(readdirSync(dir).filter((f) => !f.startsWith("assets")).sort().map((f) => [f, readFileSync(join(dir, f))]));
const pngSize = (buf) => ({ width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) });

describe("US-090: ux-builder-blueprint draw", () => {
  // @covers US-090-AC1
  test("AC1: an IA map by size class, the flow of screens and modals, and one diagram per journey, each as Mermaid and SVG", () => {
    const r = cli("draw", BLUEPRINT, "--out", "drawings");
    assert.equal(r.status, 0, r.stderr);
    const out = join(tmp, "drawings");
    assert.deepEqual(readdirSync(out).sort(), ["flow.mmd", "flow.svg", "ia.mmd", "ia.svg", "journey-J-add.mmd", "journey-J-add.svg", "journey-J-review.mmd", "journey-J-review.svg"]);
    const read = (f) => readFileSync(join(out, f), "utf8");

    // The IA map: each supported size class, its destinations where AppShell puts them, their screens and modals.
    const ia = read("ia.mmd");
    assert.match(ia, /^---\ntitle: IA map\n---\nflowchart TB\n/);
    for (const line of ['size_compact(["compact<br/><small>Bottom bar</small>"])', 'size_expanded__review(["Review<br/><small>Side navigation</small>"])', "size_compact__review --> queue", "size_expanded__settings --> settings",
      'queue -.->|"Open entry"| entry', "entry -.-> entry__reject_reason", 'legacy["Legacy report<br/><small>OldReportScreen (unreached)</small>"]']) assert.ok(ia.includes(`    ${line}\n`), line);
    assert.ok(!ia.includes("size_medium"), "only the size classes the blueprint supports");

    // The flow: every screen and modal, joined by its actions.
    const flow = read("flow.mmd");
    for (const line of ['entry__reject_reason[["Reject entry<br/><small>dialog</small>"]]', 'entry -->|"Reject"| entry__reject_reason', 'entry -->|"Try again (loading)"| entry', 'list -->|"New entry"| form', 'form -.->|"Cancel"| back']) assert.ok(flow.includes(`    ${line}\n`), line);

    // A journey: its steps in order, and its alternates branching from their step.
    const j = read("journey-J-review.mmd");
    for (const line of ['s1["1. Review queue"]', 's1 -->|"Open entry"| s2', 's2 -->|"Approve"| s3', 's2 -.->|"Reject"| a1_1', 'a1_1[["Reject entry<br/><small>The entry is wrong</small>"]]', 's2 -.->|"Try again"| a2_end']) assert.ok(j.includes(`    ${line}\n`), line);

    // Each SVG draws the same nodes as its Mermaid file, with an arrow per edge.
    for (const name of ["ia", "flow", "journey-J-review", "journey-J-add"]) {
      const svg = read(`${name}.svg`), mmd = read(`${name}.mmd`);
      assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 \d+ \d+"/);
      const ids = [...mmd.matchAll(/^ {4}(\w+)[[(]/gm)].map((m) => m[1]);
      assert.deepEqual([...svg.matchAll(/<g class="node" data-id="(\w+)">/g)].map((m) => m[1]), ids, name);
      assert.equal((svg.match(/class="edge"/g) ?? []).length, (mmd.match(/ (-->|-\.->)/g) ?? []).length, name);
    }
    assert.match(read("flow.svg"), />Reject entry<\/text>/);
  });

  // @covers US-090-AC4
  test("AC4: the same blueprint draws the same files, byte for byte", () => {
    assert.equal(cli("draw", BLUEPRINT, "--out", "once").status, 0);
    assert.equal(cli("draw", BLUEPRINT, "--out", "twice").status, 0);
    assert.deepEqual(files(join(tmp, "twice")), files(join(tmp, "once")));
    assert.deepEqual(drawings(bp()), drawings(bp()));
  });

  test("a view: the host leads to its first screen; a blueprint without actions or journeys still draws", () => {
    const view = { version: 1, kind: "view", name: "Result", supports: { sizeClasses: ["compact", "medium"] }, screens: [{ id: "main", title: "Result", pattern: "RecordDetail" }] };
    const [ia, flow, ...journeys] = drawings(view);
    assert.match(ia.mermaid, /app --> main/);
    assert.match(flow.mermaid, /main\["Result<br\/><small>RecordDetail<\/small>"\]/);
    assert.deepEqual(journeys, []);
  });
});

describe("US-090: ux-builder-blueprint wireframes", () => {
  // @covers US-090-AC2
  test("AC2: each screen by its catalogue pattern with placeholder content, at each supported size class, as HTML and PNG, in the plain theme", async () => {
    const r = cli("wireframes", BLUEPRINT, "--out", "wireframes");
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /12 HTML, 12 PNG/);
    const out = join(tmp, "wireframes");
    const plan = bp();
    for (const s of plan.screens) for (const size of plan.supports.sizeClasses) {
      const html = readFileSync(join(out, `${s.id}.${size}.html`), "utf8");
      assert.match(html, /<html lang="en" data-theme="plain" data-appearance="light" data-size-class="/);
      assert.match(html, /<link rel="stylesheet" href="assets\/plain\.css">/);
      const png = pngSize(readFileSync(join(out, `${s.id}.${size}.png`)));
      assert.equal(png.width, { compact: 390, expanded: 1024 }[size], `${s.id} at ${size}`);
    }
    assert.deepEqual(readdirSync(join(out, "assets")).sort(), ["patterns.css", "plain.css", "ui.css"]);

    // The SDK's own components draw them: the pattern's markup, in the app's shell with its destinations.
    const html = (f) => readFileSync(join(out, f), "utf8");
    assert.match(html("queue.compact.html"), /class="piq-queue/);
    assert.match(html("queue.compact.html"), /Placeholder content to review\./);
    assert.match(html("list.expanded.html"), /class="piq-collection[\s\S]*Item 1[\s\S]*Item 5/);
    assert.match(html("list.expanded.html"), />New entry</, "the primary action's label");
    assert.match(html("form.compact.html"), /class="piq-form-page/);
    assert.match(html("settings.compact.html"), /class="piq-shell[\s\S]*aria-current="page"[^>]*>[\s\S]*Settings/);
    // A pattern the catalogue lacks is a labelled box.
    assert.match(html("legacy.compact.html"), /class="wf-unknown" role="img" aria-label="Legacy report: OldReportScreen"/);
    assert.match(html("legacy.compact.html"), /OldReportScreen: not a pattern in @ux-builder\/ui/);

    // Deterministic too: the same blueprint gives the same HTML.
    const again = await wireframes(plan);
    for (const p of again) assert.equal(p.html, html(p.file), p.file);
  });
});
