/* The experience architecture in the blueprint (US-132; FEAT-018 GDL-32,
   GDL-33, GDL-35, GDL-36).

     npm test --workspace @ux-builder/ui */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { after, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { checkBlueprint } from "../blueprint/index.mjs";
import { wireframes } from "../blueprint/wireframes.mjs";
import { makeApp } from "./helix-app.mjs";

const CLI = fileURLToPath(new URL("../blueprint/cli.mjs", import.meta.url));
const SKILL = readFileSync(new URL("../../design/skill/ux-builder-design/SKILL.md", import.meta.url), "utf8");
const apps = [];
after(() => { for (const a of apps) rmSync(a.dir, { recursive: true, force: true }); });

const CONTENT = [{ label: "Rivers within an hour", kind: "data" }, { label: "Access points", kind: "data" }, { label: "Filter by activity", kind: "action" }];
const bp = (map = {}) => ({
  version: 1, kind: "app", name: "rivers",
  supports: { sizeClasses: ["compact", "expanded"], inputs: ["coarse", "fine"] },
  destinations: [{ id: "find", label: "Find", screen: "map" }],
  screens: [{ id: "map", title: "Map", pattern: "CollectionList", states: ["empty", "loading", "error"], purpose: "Find a river near you", content: CONTENT, ...map }, { id: "detail", title: "River", pattern: "RecordDetail", states: ["empty", "loading", "error"], purpose: "Judge a river" }],
});
const rule = (f, id) => f.filter((x) => x.rule === id);

describe("US-132: the experience architecture", () => {
  // @covers US-132-AC1
  test("AC1: purpose and a content list of { label, kind? } validate; content that is not a list, or an item without label, is an error naming the screen", () => {
    assert.deepEqual(checkBlueprint(bp()).filter((x) => x.severity === "error"), []);
    for (const content of ["Rivers", [{ kind: "data" }]]) {
      const f = rule(checkBlueprint(bp({ content })), "blueprint.valid");
      assert.ok(f.length >= 1, JSON.stringify(content));
      assert.ok(f.every((x) => x.path.startsWith("/screens/0/content")), JSON.stringify(f));
    }
  });

  // @covers US-132-AC2
  test("AC2: a screen with no purpose is a warning naming it (once the blueprint uses the architecture fields)", () => {
    const b = bp();
    delete b.screens[1].purpose;
    assert.deepEqual(rule(checkBlueprint(b), "screen.purpose").map((x) => [x.severity, x.path, x.message]), [["warning", "/screens/1", "River has no purpose."]]);
    // A blueprint from before the guided loop (no tasks, no purpose or content anywhere) is not warned.
    const old = bp();
    for (const s of old.screens) { delete s.purpose; delete s.content; }
    assert.deepEqual(rule(checkBlueprint(old), "screen.purpose"), []);
  });

  // @covers US-132-AC3
  test("AC3: each wireframe page shows the content items in order, before the placeholder", async () => {
    const pages = (await wireframes(bp())).filter((p) => p.screen === "map");
    assert.ok(pages.length >= 2);
    for (const p of pages) {
      const i = p.html.indexOf('<section class="wf-content"');
      assert.ok(i > 0, p.file);
      const block = p.html.slice(i, p.html.indexOf("</section>", i));
      assert.match(block, /<li>Rivers within an hour <small>\(data\)<\/small><\/li><li>Access points <small>\(data\)<\/small><\/li><li>Filter by activity <small>\(action\)<\/small><\/li>/);
      assert.ok(i < p.html.indexOf('class="piq-page'), `${p.file}: the content comes before the pattern`);
    }
  });

  // @covers US-132-AC4
  test("AC4: propose's wireframe drafts list each screen's purpose and content order", () => {
    const a = makeApp(); a.init(); apps.push(a);
    const b = JSON.parse(readFileSync(a.blueprint, "utf8"));
    b.screens[0] = { ...b.screens[0], purpose: "Review the next entry", content: [{ label: "The entry" }, { label: "Its history", kind: "data" }] };
    writeFileSync(a.blueprint, JSON.stringify(b, null, 2));
    const r = spawnSync(process.execPath, [CLI, "propose"], { cwd: a.dir, encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr);
    // HELIX's wireframe for the screen, UF-<n>-<nn>-<view>, as a patch.
    const dir = join(a.dir, "helix-proposals");
    const wf = readFileSync(join(dir, readdirSync(dir).find((f) => f.endsWith(`-${b.screens[0].id}-wireframe.patch`))), "utf8").split("\n").filter((l) => l.startsWith("+")).map((l) => l.slice(1)).join("\n");
    assert.match(wf, /^- \*\*Purpose\*\*: Review the next entry$/m);
    assert.match(wf, /^- \*\*Content, highest priority first\*\*: 1\. The entry; 2\. Its history \(data\)$/m);
  });

  // @covers US-132-AC5
  test("AC5: the skill generates IA, interaction and interface design together from the chosen flow, and fills every screen's purpose and content", () => {
    const s = SKILL.slice(SKILL.indexOf("## Design the structure"), SKILL.indexOf("## Checkpoints"));
    assert.match(s, /generate the information architecture, the\s+interaction design and the interface design together/);
    assert.match(s, /For every screen, fill its `purpose`[\s\S]*and its `content`/);
  });
});
