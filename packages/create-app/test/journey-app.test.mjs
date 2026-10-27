/* The app built from a design opens on its journeys (US-159), and the
   build installs no starter HELIX document the design already has (US-156-AC3;
   FEAT-018 GDL-81).

     npm test --workspace @ux-builder/create-app */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { buildInPlace } from "../design-first.mjs";
import { headerOf, journeyModel, stamp } from "../journey-app.mjs";
import { bundle } from "./fixtures/helix-release.mjs";

const CLI = fileURLToPath(new URL("../index.mjs", import.meta.url));
const DESIGN = fileURLToPath(new URL("../../design/cli.mjs", import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), "journey-app-"));
const BUNDLE = bundle("8.8.0");
after(() => { rmSync(tmp, { recursive: true, force: true }); rmSync(BUNDLE, { recursive: true, force: true }); });
const ENV = { ...process.env, UX_BUILDER_HELIX_API: "http://127.0.0.1:9", UX_BUILDER_HELIX_BUNDLE: BUNDLE };
const run = (cmd, cwd, ...args) => spawnSync(process.execPath, [cmd, ...args], { encoding: "utf8", cwd, env: ENV, stdio: ["ignore", "pipe", "pipe"] });
const BP = "docs/ux-builder/blueprint/app.blueprint.json";
const sha = (t) => createHash("sha256").update(t).digest("hex");
const put = (dir, p, text) => { mkdirSync(join(dir, p, ".."), { recursive: true }); writeFileSync(join(dir, p), text); };
const read = (dir, p) => readFileSync(join(dir, p), "utf8");

const st = ["empty", "loading", "error"];
/* A designed blueprint: three screens, a dialog, two journeys, a task citing a business rule. */
const designed = (supports) => ({
  version: 1, kind: "app", name: "rivers", supports,
  destinations: [{ id: "find", label: "Find", screen: "map" }, { id: "saved", label: "Saved", screen: "saved" }],
  screens: [
    { id: "map", title: "River map", pattern: "CollectionList", states: st, purpose: "Find a river with public access", content: [{ label: "Rivers" }, { label: "Access points", kind: "details" }, { label: "Fishing report", kind: "text" }], actions: [{ id: "open", label: "Open river details", to: "detail", primary: true }] },
    { id: "detail", title: "River details", pattern: "RecordDetail", states: st, purpose: "Judge a river before driving there", content: [{ label: "Access" }, { label: "Recent catches", kind: "data" }],
      actions: [{ id: "save", label: "Save river", to: "modal:confirm", primary: true }],
      modals: [{ id: "confirm", title: "Save this river?", kind: "dialog", dismiss: "cancel", actions: [{ id: "keep", label: "Keep it", to: "saved", primary: true }] }] },
    { id: "saved", title: "Saved rivers", pattern: "CollectionList", states: st, purpose: "Go back to a river", content: [{ label: "Saved rivers" }], actions: [{ id: "again", label: "Open again", to: "detail" }] },
  ],
  tasks: [{ id: "T-1", goal: "Find a river to fish this weekend", rules: ["BR-1"], success: ["US-001-AC1"] }, { id: "T-2", goal: "Go back to a river you saved", success: ["US-002-AC1"] }],
  journeys: [
    { id: "J-find", story: "US-001", task: "T-1", entry: "map", steps: [{ screen: "map", action: "open" }, { screen: "detail", action: "save", inputs: { required: ["Trip date"] } }, { screen: "modal:confirm", action: "keep" }, { screen: "saved" }] },
    { id: "J-saved", story: "US-002", task: "T-2", entry: "saved", steps: [{ screen: "saved", action: "again" }, { screen: "detail" }] },
  ],
  businessRules: [{ id: "BR-1", trigger: "The river has no public access", before: "Private stretches are marked on the map", blocked: "Save is replaced by: Private, no public access", recover: "Nearby public stretches are offered" }],
});

/* A design folder with its modality recorded and the designed blueprint, ready to build. */
function folder(name, prepare) {
  assert.equal(run(CLI, tmp, name).status, 0);
  const dir = join(tmp, name);
  assert.equal(run(DESIGN, dir, "modality", "--answer", "A web app for phones and laptops", "--modality", "responsive-web", "--size-classes", "compact,expanded").status, 0);
  const bp = JSON.parse(read(dir, BP));
  writeFileSync(join(dir, BP), JSON.stringify(designed(bp.supports), null, 2) + "\n");
  prepare?.(dir);
  return dir;
}
const data = async (dir) => import(`${pathToFileURL(join(dir, "src/journey/blueprint.js")).href}?${Date.now()}`);

describe("US-159: the app built from a design opens on its journeys", () => {
  let dir, built;

  // @covers US-159-AC1
  test("AC1: a route per screen, its title, purpose and content in order with sample data, the journeys' actions leading step to step, the dialogs", async () => {
    dir = folder("rivers");
    built = run(CLI, dir, ".", "--theme", "plain");
    assert.equal(built.status, 0, built.stderr);
    assert.match(built.stdout, /The app opens on the designed journeys: 3 screens \(src\/screens\/\), journeys J-find, J-saved/);
    for (const f of ["src/App.jsx", "src/journey/runtime.jsx", "src/journey/blueprint.js", "src/screens/MapScreen.jsx", "src/screens/DetailScreen.jsx", "src/screens/SavedScreen.jsx", "e2e/journeys.spec.js"]) assert.ok(existsSync(join(dir, f)), f);
    assert.ok(!existsSync(join(dir, "src/Home.jsx")), "no empty Home");
    const app = read(dir, "src/App.jsx");
    assert.match(app, /"\/": MapScreen,\n {2}"\/detail": DetailScreen,\n {2}"\/saved": SavedScreen,/);
    assert.match(app, /<AppShell nav=\{NAV\}[^>]*onNavigate=\{\(item\) => navigate\(item\.href\)\}/);
    const { SCREENS, JOURNEYS, DESTINATIONS, SAMPLE } = await data(dir);
    assert.deepEqual(SCREENS.map((s) => [s.id, s.path, s.title, s.purpose]), [["map", "/", "River map", "Find a river with public access"], ["detail", "/detail", "River details", "Judge a river before driving there"], ["saved", "/saved", "Saved rivers", "Go back to a river"]]);
    assert.deepEqual(DESTINATIONS.map((d) => [d.label, d.path]), [["Find", "/"], ["Saved", "/saved"]]);
    // The content in the blueprint's order, each drawn with the SDK's components.
    const map = read(dir, "src/screens/MapScreen.jsx");
    const at = (s) => map.indexOf(`<Card title={${JSON.stringify(s)}}>`);
    assert.ok(at("Rivers") > 0 && at("Rivers") < at("Access points") && at("Access points") < at("Fishing report"), map);
    assert.match(map, /<DataTable caption=\{"Rivers"\}/);
    assert.match(map, /<DescriptionList items=\{sample\.content\[1\]/);
    for (const [, from] of map.matchAll(/^import .* from "([^"]+)";$/gm)) assert.ok(/^@ux-builder\/ui(\/patterns)?$|^\.\.\/journey\//.test(from), from);
    // Sample data from the blueprint: the same every time, no network.
    assert.deepEqual(SAMPLE.map.content[0].rows.map((r) => r.name), ["River 1", "River 2", "River 3"]);
    assert.deepEqual(journeyModel(designed({ modalities: ["responsive-web"] })).sample, journeyModel(designed({ modalities: ["responsive-web"] })).sample);
    assert.match(read(dir, "src/screens/DetailScreen.jsx"), /<TextField label=\{"Trip date"\} required \{\.\.\.field\("trip-date"\)\} \/>/);
    // The journeys: their steps in order; each action leads to the next step, a step with no action gets one.
    assert.deepEqual(JOURNEYS.map((j) => [j.id, j.steps.map((s) => s.path + (s.modal ? `#${s.modal}` : ""))]), [["J-find", ["/", "/detail", "/detail#confirm", "/saved"]], ["J-saved", ["/saved", "/detail"]]]);
    const actions = Object.fromEntries(SCREENS.map((s) => [s.id, s.actions]));
    assert.deepEqual(actions.map[0].go, { kind: "screen", path: "/detail" });
    assert.deepEqual(actions.detail[0].go, { kind: "modal", modal: "confirm" });
    assert.deepEqual(actions.saved[0].go, { kind: "screen", path: "/detail" });
    // The dialog the blueprint declares.
    assert.deepEqual(SCREENS[1].modals, [{ id: "confirm", title: "Save this river?", kind: "dialog", dismiss: "Cancel", fields: [], actions: [{ id: "keep", label: "Keep it", primary: true, go: { kind: "screen", path: "/saved" } }] }]);
    const runtime = read(dir, "src/journey/runtime.jsx");
    assert.match(runtime, /return <Dialog open=\{open\} onClose=\{onClose\} title=\{modal\.title\} actions=\{actions\}>/);
    assert.match(runtime, /if \(go\.kind === "screen"\) navigate\(go\.path\);/);
    // The e2e test walks each journey by its actions.
    assert.match(read(dir, "e2e/journeys.spec.js"), /\[data-piq-screen=\\"map\\"\] \[data-action=\\"open\\"\][\s\S]*toHaveURL\(new RegExp\("\/detail\(\\\\\?\|\$\)"\)\)/);
  });

  // @covers US-159-AC2
  test("AC2: each screen's loading, empty, error and recovery states and its business-rule warnings; ?state= forces one; the toolbar resets the sample data", async () => {
    const { SCREENS } = await data(dir);
    // The task cites BR-1: a warning on each screen of its journey, and the state where the rule blocks.
    assert.deepEqual(SCREENS.map((s) => s.states), SCREENS.map(() => ["ideal", "loading", "empty", "error", "blocked"]));
    assert.deepEqual(SCREENS.map((s) => s.rules.map((r) => r.id)), [["BR-1"], ["BR-1"], ["BR-1"]]);
    assert.equal(SCREENS[0].rules[0].before, "Private stretches are marked on the map");
    const runtime = read(dir, "src/journey/runtime.jsx");
    assert.match(runtime, /const forced = params\.get\("state"\);/);
    assert.match(runtime, /if \(state === "loading"\) body = <div aria-busy="true">/);
    assert.match(runtime, /<StatePanel kind=\{state\} onRetry=\{\(\) => to\("loading"\)\}/, "error retries into loading, which settles: the recovery");
    assert.match(runtime, /setTimeout\(\(\) => setOwn\("ideal"\), SETTLE\)/);
    assert.match(runtime, /<Notice key=\{r\.id\} tone="warning" title=\{r\.before/);
    assert.match(runtime, /tone="error" role="alert" title=\{r\.blocked/);
    assert.match(runtime, /if \(!\(import\.meta\.env\?\.DEV \|\| params\.has\("prototype"\)\)\) return null;/, "the toolbar in npm run dev, or with ?prototype");
    assert.match(runtime, /<Button variant="secondary" onClick=\{resetSampleData\}>Reset prototype data<\/Button>/);
    assert.match(runtime, /window\.localStorage\.removeItem\(KEY\)/);
    assert.match(read(dir, "e2e/journeys.spec.js"), /\?state=error[\s\S]*name: "Try again"[\s\S]*"data-state", "ideal"/);
    // The assessment's manifest walks the designed journeys in every state the skeleton shows.
    const manifest = read(dir, "docs/ux-builder/ux-assessment.yml");
    assert.match(manifest, /- id: J-find\n {4}blueprint: J-find\n {4}priority: critical\n {4}role: member\n {4}states: \[success, empty, loading, recoverable-error, system-failure, responsive-keyboard\]/);
    assert.doesNotMatch(manifest, /J-start/);
  });

  // @covers US-159-AC3
  test("AC3: generated files name the blueprint and its hash; --prototype replaces only those not edited by hand, and lists the rest", () => {
    const hash = sha(read(dir, BP));
    for (const f of ["src/App.jsx", "src/journey/runtime.jsx", "src/journey/blueprint.js", "src/screens/MapScreen.jsx", "e2e/journeys.spec.js"]) {
      const text = read(dir, f);
      assert.match(text, new RegExp(`^// @generated by @ux-builder/create-app from docs/ux-builder/blueprint/app\\.blueprint\\.json\\n// blueprint sha256:${hash} content sha256:[0-9a-f]{64}\\n`), f);
      assert.deepEqual([headerOf(text).generated, headerOf(text).edited], [true, false], f);
    }
    assert.match(JSON.parse(read(dir, "package.json")).scripts.prototype, /^npx @ux-builder\/create-app@\d+\.\d+\.\d+ --prototype \.$/);
    // Edit one screen by hand, then change the blueprint: a title, and the Saved screen gone.
    const edited = read(dir, "src/screens/DetailScreen.jsx").replace("<ScreenFrame", "{/* mine */}\n    <ScreenFrame");
    writeFileSync(join(dir, "src/screens/DetailScreen.jsx"), edited);
    const bp = JSON.parse(read(dir, BP));
    bp.screens[0].title = "Rivers near you";
    bp.screens[0].actions.push({ id: "mine", label: "My rivers", to: "detail" });
    writeFileSync(join(dir, BP), JSON.stringify(bp, null, 2) + "\n");
    writeFileSync(join(dir, "src/screens/OldScreen.jsx"), stamp("export const Old = 1;\n", { blueprint: BP, hash }));
    const again = run(CLI, tmp, dir, "--prototype");
    assert.equal(again.status, 0, again.stderr);
    assert.match(again.stdout, /left as they are:\n {4}src\/screens\/DetailScreen\.jsx \(edited by hand\)/);
    assert.match(again.stdout, /removed: {3}src\/screens\/OldScreen\.jsx/);
    assert.equal(read(dir, "src/screens/DetailScreen.jsx"), edited, "the hand-edited file is left");
    assert.ok(!existsSync(join(dir, "src/screens/OldScreen.jsx")));
    const next = sha(read(dir, BP));
    assert.match(read(dir, "src/journey/blueprint.js"), new RegExp(`blueprint sha256:${next} [\\s\\S]*"title": "Rivers near you"`));
    assert.match(read(dir, "src/screens/MapScreen.jsx"), new RegExp(`blueprint sha256:${next} `));
    // A file the generator did not write is never replaced.
    writeFileSync(join(dir, "src/App.jsx"), "// mine\n");
    const third = run(CLI, tmp, dir, "--prototype");
    assert.match(third.stdout, /src\/App\.jsx \(not written by the generator\)/);
    assert.equal(read(dir, "src/App.jsx"), "// mine\n");
  });

  test("a blueprint with no journeys, a view, or no responsive-web keeps the starter's shell", () => {
    const bp = designed({ modalities: ["responsive-web"] });
    assert.match(journeyModel({ ...bp, journeys: [] }).skip, /no screens with journeys/);
    assert.match(journeyModel({ ...bp, kind: "view" }).skip, /a view's/);
    assert.match(journeyModel(bp, { modalities: ["chat"] }).skip, /no responsive-web/);
    // A step with no action leads on to the next step's screen.
    const quiet = structuredClone(bp);
    delete quiet.screens[2].actions;
    quiet.journeys[1].steps[0] = { screen: "saved" };
    assert.deepEqual(journeyModel(quiet).screens[2].actions, [{ id: "continue-detail", label: "Continue to River details", primary: false, go: { kind: "screen", path: "/detail", journey: "J-saved" } }]);
    const both = journeyModel(bp, { modalities: ["responsive-web", "hybrid-chat"] });
    assert.deepEqual(both.destinations.map((d) => d.path), ["/", "/saved", "/assistant"]);
  });
});

describe("US-156: the build installs no starter document the design already has", () => {
  // @covers US-156-AC3
  test("AC3: a design with FEAT-001 and US-001 under its own names gets no second FEAT-001, US-001 or STP-001, and the result lists them as skipped", async () => {
    const FEAT = "---\nddx:\n  id: FEAT-001\n  type: feature-specification\n  status: draft\n---\n\n# FEAT-001: Reminders\n";
    const US = "---\nddx:\n  id: US-001\n  type: user-stories\n---\n\n# US-001: Remind me before the trip\n\n- [ ] **US-001-AC1** — Given a trip, when it is a day away, then I am reminded.\n";
    const dir = folder("reminders", (d) => {
      put(d, "docs/helix/01-frame/features/FEAT-001-reminders.md", FEAT);
      put(d, "docs/helix/01-frame/user-stories/US-001-remind-me.md", US);
    });
    const r = await buildInPlace(dir, { theme: "plain" });
    const ids = readdirSync(join(dir, "docs/helix"), { recursive: true }).map(String).filter((f) => f.endsWith(".md"))
      .map((f) => /^\s*id:\s*(\S+)/m.exec(read(dir, join("docs/helix", f)))?.[1]).filter(Boolean);
    for (const id of ["FEAT-001", "US-001"]) assert.equal(ids.filter((x) => x === id).length, 1, `${id}: ${ids.join(", ")}`);
    assert.ok(!ids.includes("STP-001"), ids.join(", "));
    assert.equal(read(dir, "docs/helix/01-frame/features/FEAT-001-reminders.md"), FEAT);
    assert.equal(read(dir, "docs/helix/01-frame/user-stories/US-001-remind-me.md"), US);
    assert.deepEqual(r.helix.skipped.map((s) => [s.id, s.why]), [
      ["FEAT-001", "docs/helix/01-frame/features/FEAT-001-reminders.md already has the ID FEAT-001"],
      ["US-001", "docs/helix/01-frame/user-stories/US-001-remind-me.md already has the ID US-001"],
      ["STP-001", "it maps the starter's US-001, which was not written"],
    ]);
    assert.ok(r.helix.documents.includes("docs/helix/01-frame/prd.md"), "the rest of the starter set where the design has none");
    // No starter document links to one that was not written; the starter's test claims none of the design's criteria.
    assert.doesNotMatch(read(dir, "e2e/starter.spec.js"), /@covers US-001/);
    // A design whose feature spec has another number: the starter's FEAT-001 and its story are left out too.
    const other = folder("other-number", (d) => put(d, "docs/helix/01-frame/features/FEAT-007-trips.md", FEAT.replace("FEAT-001", "FEAT-007")));
    const o = await buildInPlace(other, { theme: "plain" });
    assert.deepEqual(o.helix.skipped.map((s) => s.id), ["FEAT-001", "US-001", "STP-001"]);
    assert.match(o.helix.skipped[0].why, /the design already has a feature-specification document \(FEAT-007/);
    assert.doesNotMatch(read(other, "docs/helix/02-design/DESIGN.md"), /to: FEAT-001/, "no link to a starter document that was not written");
  });
});
