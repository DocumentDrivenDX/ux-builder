/* A prototype ends every step: drawing it with the defaults not yet chosen
   recorded as assumptions, and its check round (US-163-AC1 to AC3;
   FEAT-018 GDL-84; ADR-042). The audit runner is stubbed: no browser.

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { confirmModality, heuristics, readState, stepCheck, stepPrototype, writeState } from "../index.mjs";
import { cli } from "./helpers.mjs";
import { KIT_BP, kitApp } from "./kit-fixture.mjs";

const BP = "docs/ux-builder/blueprint/app.blueprint.json";
/* The kit app with no supports: nothing about modality chosen yet. */
function app() {
  const a = kitApp();
  const { supports, ...bp } = structuredClone(KIT_BP);
  bp.screens[1].actions = [{ id: "save", label: "Save river", to: "saved" }];
  bp.tasks = bp.tasks.map((t, k) => ({ ...t, success: [k ? "US-002-AC1" : "US-001-AC2"] }));
  writeFileSync(join(a, BP), JSON.stringify(bp, null, 2));
  return a;
}
const stub = (calls = []) => async (args) => { calls.push(args); return { ran: true, pagesAudited: args.pages.length, errors: 1, warnings: 0, findings: [{ severity: "error", rule: "contrast", page: args.pages[0], message: "low contrast" }] }; };
const about = (a, key) => readState(a).assumptions.find((x) => x.about === key);

describe("US-163: a prototype ends every step", () => {
  // @covers US-163-AC1
  test("AC1: with no modality recorded, the step prototype assumes responsive web, four size classes and the recommended frame, and records them", async () => {
    const a = app();
    const r = await stepPrototype(a);
    assert.equal(r.step, 1);
    assert.equal(r.dir, "docs/ux-builder/prototypes/step-1");
    assert.ok(existsSync(join(a, r.dir, "index.html")));
    assert.match(readFileSync(join(a, r.dir, "map.compact.html"), "utf8"), /Step 1 of 8, Define intent/);
    assert.ok(existsSync(join(a, r.dir, "map.large.html")), "compact, medium, expanded and large");
    assert.match(about(a, "modality").text, /responsive web/);
    assert.match(about(a, "size-classes").text, /compact, medium, expanded, large/);
    assert.match(about(a, "frame").text, /top-nav \(2 destinations/);
    assert.equal(about(a, "modality").status, "assumed");
    const sp = readState(a).stepPrototypes["1"];
    assert.equal(sp.dir, r.dir);
    assert.deepEqual(sp.rounds, []);
    assert.equal(JSON.parse(readFileSync(join(a, BP), "utf8")).supports, undefined, "the app's blueprint is not changed");
    // Drawn again, the same assumptions are updated, not added.
    const n = readState(a).assumptions.length;
    await stepPrototype(a);
    assert.equal(readState(a).assumptions.length, n);
    // A recorded modality is used as it is, and assumes nothing about it.
    const b = app();
    confirmModality(b, { answer: "Phones only, one screen at a time", modalities: "responsive-web", sizeClasses: "compact", frame: "screen" });
    const r2 = await stepPrototype(b);
    assert.ok(!existsSync(join(b, r2.dir, "map.expanded.html")));
    assert.equal(about(b, "modality"), undefined);
    assert.ok(about(b, "theme"));
  });

  // @covers US-163-AC1
  test("AC1: a blueprint with errors is refused, exit 1, and nothing is written", () => {
    const a = app();
    const bp = JSON.parse(readFileSync(join(a, BP), "utf8"));
    writeFileSync(join(a, BP), JSON.stringify({ ...bp, journeys: [{ id: "J-x", entry: "nowhere", steps: [{ screen: "nowhere" }] }] }));
    const r = cli(a, ["prototype", "--step"]);
    assert.equal(r.status, 1, r.stderr);
    assert.match(r.stderr, /error.*Nothing was written/s);
    assert.ok(!existsSync(join(a, "docs/ux-builder/prototypes/step-1")));
  });

  // @covers US-163-AC2
  test("AC2: with no theme chosen it is plain, light by default, dark when the agent set it, the appearance recorded with its reason", async () => {
    const a = app();
    await stepPrototype(a);
    assert.match(readFileSync(join(a, "docs/ux-builder/prototypes/step-1/map.compact.html"), "utf8"), /data-theme="plain" data-appearance="light"/);
    assert.match(about(a, "appearance").text, /light/);
    assert.match(about(a, "theme").text, /plain/);
    const s = readState(a);
    s.appearance = { value: "dark", reason: "a nightlife guest list, used in dark venues" };
    writeState(a, s);
    const r = await stepPrototype(a);
    assert.equal(r.appearance, "dark");
    assert.match(readFileSync(join(a, r.dir, "map.compact.html"), "utf8"), /data-theme="plain" data-appearance="dark"/);
    assert.match(about(a, "appearance").text, /dark: a nightlife guest list/);
  });

  // @covers US-163-AC3
  test("AC3: --check audits each screen's ideal state at every size and its other states at one, writes check-1.json and records the round; the journey walk from step 5", async () => {
    const { auditPages } = await import("../index.mjs");
    const a = app();
    const p = await stepPrototype(a);
    const calls = [];
    const r = await stepCheck(a, { audit: stub(calls) });
    const all = readState(a).stepPrototypes["1"].pages;
    assert.deepEqual(calls[0].pages, auditPages(all));
    assert.ok(calls[0].pages.length < all.length / 2, `${calls[0].pages.length} of ${all.length}`);
    assert.ok(calls[0].pages.includes("map.large.html") && calls[0].pages.includes("map.error.compact.html") && !calls[0].pages.includes("map.error.large.html"));
    assert.equal(r.round, 1);
    assert.equal(r.pagesAudited, calls[0].pages.length);
    assert.equal(r.journeyWalk, null);
    assert.ok(r.heuristics.some((h) => h.heuristic === "information-hierarchy"), "screens with no content order are found");
    assert.ok(r.findings.every((f) => /^C-[0-9a-f]{6}$/.test(f.id)), "each finding has an ID");
    const written = JSON.parse(readFileSync(join(a, p.dir, "check-1.json"), "utf8"));
    assert.equal(written.pagesAudited, r.pagesAudited);
    assert.equal(r.ready, false);
    // Drawn again with nothing changed, the next round audits no page and keeps the findings and their IDs.
    await stepPrototype(a);
    const again = await stepCheck(a, { audit: stub(calls) });
    assert.equal(calls.length, 1, "no page changed, no audit");
    assert.equal(again.round, 2, "the rounds are kept across a redraw");
    assert.deepEqual(again.findings.map((f) => f.id).sort(), r.findings.map((f) => f.id).sort());
    // A finding fixed is gone; the rest are accepted one by one, with a reason.
    const bp = JSON.parse(readFileSync(join(a, BP), "utf8"));
    bp.screens[0].content = [{ label: "Rivers nearby", kind: "data" }];
    writeFileSync(join(a, BP), JSON.stringify(bp, null, 2));
    await stepPrototype(a);
    const fixed = await stepCheck(a, { audit: stub(calls) });
    assert.ok(calls.at(-1).pages.every((f) => f.startsWith("map.")), "only the changed screen's pages are audited");
    assert.ok(fixed.findings.length < again.findings.length);
    await assert.rejects(stepCheck(a, { accept: [fixed.open[0].id] }), /needs --reason/);
    const ok = await stepCheck(a, { accept: fixed.open.map((f) => f.id), reason: "the fixture's own gaps" });
    assert.equal(ok.ready, true);
    // From step 5 the journeys are walked too.
    const s = readState(a);
    s.step = 5;
    writeState(a, s);
    await stepPrototype(a);
    assert.equal((await stepCheck(a, { audit: stub() })).journeyWalk, "requested");
  });

  // @covers US-163-AC3
  test("AC3: --nothing-to-fix before a check, or a check before a prototype, is refused", async () => {
    const a = app();
    await assert.rejects(stepCheck(a, { audit: stub() }), /no prototype to check/);
    await stepPrototype(a);
    await assert.rejects(stepCheck(a, { nothingToFix: true }), /follows a check/);
  });

  test("the heuristics find content out of order and a journey longer than its shortest path", () => {
    const bp = { ...KIT_BP, screens: KIT_BP.screens.map((s) => (s.id === "map" ? { ...s, content: [{ label: "Rivers nearby" }, { label: "Access" }] } : s)) };
    const found = heuristics(bp, { "map.compact.html": "<main><p>Access</p><p>Rivers nearby</p></main>" });
    assert.ok(found.some((h) => h.screen === "map" && /out of priority order/.test(h.finding)));
  });
});

describe("VIP List session 2: the prototype's defaults stay out of review, and the brief does not read its PRD back", () => {
  test("drawing a step prototype changes neither the approved brief nor the map's exceptions", async () => {
    const { brief, coverageMap, pendingReviews, reviewApprove } = await import("../index.mjs");
    const a = app();
    brief(a, { name: "Rivers" });
    reviewApprove(a, { kind: "brief", answer: "Yes" });
    const before = coverageMap(a).exceptions.map((e) => e.id);
    await stepPrototype(a);
    brief(a, { name: "Rivers" });
    assert.ok(!pendingReviews(a).some((p) => p.id === "brief"), "the brief keeps its approval");
    assert.deepEqual(coverageMap(a).exceptions.map((e) => e.id), before, "no exception for a default");
    assert.ok(readState(a).assumptions.filter((x) => x.about).every((x) => !x.section));
  });

  test("a PRD line that repeats the design state does not come back into the brief", async () => {
    const { brief, pendingReviews, reviewApprove, stateSet } = await import("../index.mjs");
    const a = app();
    stateSet(a, { path: "assumptions[+]", value: { text: "River Path helps people discover rivers and the places to reach them", section: "product", status: "confirmed" } });
    brief(a, { name: "Rivers" });
    reviewApprove(a, { kind: "brief", answer: "Yes" });
    writeFileSync(join(a, "docs/helix/01-frame/prd.md"), "---\nddx:\n  id: prd\n  type: prd\n---\n\n# Product Requirements Document — River Path\n\n## Summary\n\nRiver Path helps people discover rivers and the places to reach them.\n");
    brief(a, { name: "Rivers" });
    assert.ok(!pendingReviews(a).some((p) => p.id === "brief"), "the PRD's repeat of the product line does not reopen it");
    assert.equal((readFileSync(join(a, "docs/ux-builder/brief.md"), "utf8").match(/discover rivers/g) ?? []).length, 1);
  });
});

describe("VIP List session 2: once the app is built, the step prototype is the app", () => {
  test("prototype --step builds the app and records its routes; the check audits them, served as an app", async () => {
    const { mkdirSync } = await import("node:fs");
    const a = app();
    mkdirSync(join(a, "src"), { recursive: true });
    writeFileSync(join(a, "src/App.jsx"), 'const ROUTES = {\n  "/": TonightScreen,\n  "/door": DoorScreen,\n};\n');
    mkdirSync(join(a, "dist/assets"), { recursive: true });
    writeFileSync(join(a, "dist/index.html"), "<!doctype html><div id=root></div>");
    writeFileSync(join(a, "dist/assets/index-abc.js"), "");
    const s = readState(a);
    s.step = 6;
    s.app = { builtAt: "2026-10-31T12:00:00.000Z", theme: "plain", modalities: ["responsive-web"] };
    s.appearance = { value: "dark", reason: "a nightlife app" };
    writeState(a, s);
    let built = 0;
    const r = await stepPrototype(a, { build: async () => { built++; return { ok: true }; } });
    assert.equal(built, 1);
    assert.deepEqual([r.app, r.dir, r.pages, r.appearance], [true, "dist", 2, "dark"]);
    const calls = [];
    const c = await stepCheck(a, { audit: stub(calls) });
    assert.deepEqual(calls[0].pages, ["/", "/door"]);
    assert.equal(calls[0].spa, true);
    assert.ok(existsSync(join(a, "docs/ux-builder/prototypes/step-6/check-1.json")));
    assert.equal(c.round, 1);
    // A failed build is refused, with nothing recorded.
    await assert.rejects(stepPrototype(a, { build: async () => ({ ok: false, log: "error TS" }) }), /the app did not build/);
  });
});
