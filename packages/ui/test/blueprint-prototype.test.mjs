/* Exploratory prototypes (US-135-AC1 to AC3, AC6; FEAT-018 GDL-40, GDL-41;
   ADR-037).

     npm test --workspace @ux-builder/ui */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const CLI = fileURLToPath(new URL("../blueprint/cli.mjs", import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), "bp-proto-"));
after(() => rmSync(tmp, { recursive: true, force: true }));
const run = (dir, ...args) => spawnSync(process.execPath, [CLI, ...args], { cwd: dir, encoding: "utf8" });

const st = ["empty", "loading", "error"];
const MAP = {
  version: 1, kind: "app", name: "rivers", supports: { sizeClasses: ["compact", "expanded"], inputs: ["coarse", "fine"] },
  destinations: [{ id: "find", label: "Find", screen: "map" }],
  screens: [
    { id: "map", title: "Map", pattern: "CollectionList", states: st, actions: [{ id: "open", label: "Open river", to: "detail", primary: true }, { id: "retry", label: "Try again", to: "state:error" }] },
    { id: "detail", title: "River", pattern: "RecordDetail", states: st, actions: [{ id: "back", label: "Back", to: "back" }, { id: "maps", label: "Directions", to: "external" }] },
  ],
};
function app(bp = MAP) {
  const dir = mkdtempSync(join(tmp, "app-"));
  writeFileSync(join(dir, "app.blueprint.json"), JSON.stringify(MAP));
  writeFileSync(join(dir, "app.blueprint.map-first.json"), JSON.stringify(bp));
  return dir;
}

describe("US-135: exploratory prototypes", () => {
  // @covers US-135-AC1
  test("AC1: prototype --explore writes prototype/<name>/ with a page per screen rendering its pattern, every action linked to its to", () => {
    const dir = app();
    const r = run(dir, "prototype", "--explore", "--alternative", "map-first", "--question", "Is map first easier than search first?");
    assert.equal(r.status, 0, r.stderr);
    const files = readdirSync(join(dir, "prototype/map-first"));
    for (const f of ["index.html", "map.compact.html", "map.expanded.html", "detail.compact.html", "assets"]) assert.ok(files.includes(f), f);
    const map = readFileSync(join(dir, "prototype/map-first/map.compact.html"), "utf8");
    assert.match(map, /<body data-piq-screen="map" data-prototype="exploratory">/);
    assert.match(map, /class="piq-collection-list|piq-page/, "the pattern is rendered");
    assert.match(map, /<a href="detail\.compact\.html" data-action="open">Open river<\/a>/);
    assert.match(map, /<a href="map\.error\.compact\.html" data-action="retry">Try again<\/a>/);
    const detail = readFileSync(join(dir, "prototype/map-first/detail.compact.html"), "utf8");
    assert.match(detail, /<a href="javascript:history\.back\(\)" data-action="back">Back \(back\)<\/a>/);
    assert.match(detail, /<span data-action="maps">Directions \(leaves the app\)<\/span>/);
    assert.match(readFileSync(join(dir, "prototype/map-first/index.html"), "utf8"), /url=map\.compact\.html/);
    // The page's own controls lead where the bar's links do: a button named as an action, and the navigation's destinations.
    const go = JSON.parse(map.match(/const go = (\{.*?\});/)[1]);
    assert.equal(go["Open river"], "detail.compact.html");
    assert.equal(go["Try again"], "map.error.compact.html");
    assert.equal(JSON.parse(detail.match(/const go = (\{.*?\});/)[1]).Back, "back");
    // Each page knows its size class's widths, to say when the window shows another layout and offer to open it at its own.
    assert.match(map, /<p class="proto-width" role="status" data-size-class="compact" data-min="0" data-max="600" data-width="390" hidden><\/p>/);
    assert.match(readFileSync(join(dir, "prototype/map-first/map.expanded.html"), "utf8"), /data-size-class="expanded" data-min="840" data-max="1200" data-width="1024"/);
    assert.match(map, /shows another size class's layout/);
  });

  // @covers US-135-AC2
  test("AC2: each page has a switcher for each state and size class, a prototype banner and the design question", () => {
    const dir = app();
    run(dir, "prototype", "--explore", "--alternative", "map-first", "--question", "Is map first easier than search first?");
    const page = readFileSync(join(dir, "prototype/map-first/map.empty.expanded.html"), "utf8");
    assert.match(page, /<p class="proto-banner" role="note"><strong>Prototype<\/strong>, not the app: Is map first easier than search first\?<\/p>/);
    assert.match(page, /<nav aria-label="States"><span>State:<\/span> <a href="map\.expanded\.html">ideal<\/a> · <a href="map\.loading\.expanded\.html">loading<\/a> · <a href="map\.empty\.expanded\.html" aria-current="page">empty<\/a> · <a href="map\.error\.expanded\.html">error<\/a><\/nav>/);
    assert.match(page, /<nav aria-label="Size classes"><span>Size:<\/span> <a href="map\.empty\.compact\.html">compact<\/a> · <a href="map\.empty\.expanded\.html" aria-current="page">expanded<\/a><\/nav>/);
  });

  // @covers US-135-AC3
  test("AC3: --design-system twice writes one prototype per design system, each named by it", () => {
    const dir = app();
    const r = run(dir, "prototype", "--explore", "--alternative", "map-first", "--design-system", "material", "--design-system", "carbon", "--json");
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.deepEqual(out.prototypes.map((p) => [p.dir, p.theme]), [["prototype/map-first-material", "praxis-material"], ["prototype/map-first-carbon", "praxis-carbon"]]);
    assert.match(readFileSync(join(dir, "prototype/map-first-material/map.compact.html"), "utf8"), /data-theme="praxis-material"[\s\S]*assets\/praxis-material\.css/);
    assert.ok(existsSync(join(dir, "prototype/map-first-carbon/assets/praxis-carbon.css")));
  });

  // @covers US-135-AC6
  test("AC6: an alternative with a check error: exit 1 naming the findings, nothing written", () => {
    const broken = { ...MAP, screens: [{ ...MAP.screens[0], actions: [{ id: "open", label: "Open", to: "nowhere" }] }, MAP.screens[1]] };
    const dir = app(broken);
    const r = run(dir, "prototype", "--explore", "--alternative", "map-first");
    assert.equal(r.status, 1);
    assert.match(r.stderr, /error {3}flow\.target-exists/);
    assert.match(r.stderr, /Nothing was written\./);
    assert.equal(existsSync(join(dir, "prototype")), false);
  });

  test("--archive moves a prototype under prototype/.archive/", () => {
    const dir = app();
    run(dir, "prototype", "--explore", "--alternative", "map-first");
    assert.equal(run(dir, "prototype", "--archive", "map-first").status, 0);
    assert.ok(existsSync(join(dir, "prototype/.archive/map-first/index.html")));
    assert.equal(existsSync(join(dir, "prototype/map-first")), false);
  });
});
