/* The responsive-web verdict judged by outcome (US-157; FEAT-014 MOD-09):
   a page frame that fits, navigation that adapts where there is any, and
   only the size classes the app chose, on the fixture apps in
   fixtures/modality-apps.mjs and as a pure function.

     npm run build && npm test --workspace @ux-builder/audit */

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { widthsFor } from "@ux-builder/ui/blueprint/modalities";
import { audit } from "../audit.mjs";
import { modalityVerdicts } from "../verdicts.mjs";
import { BLUEPRINT, modalityApps } from "./fixtures/modality-apps.mjs";

const PKG = fileURLToPath(new URL("..", import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), "audit-outcome-"));
let apps;
before(async () => { apps = await modalityApps(); });
after(() => { apps?.close(); rmSync(tmp, { recursive: true, force: true }); });

const run = (pages, more = {}) => audit({ urls: pages.map((p) => apps.url(p)), themes: ["praxis-carbon"], appearances: ["light"], contrast: false, cwd: PKG, ...more });
const web = (r) => r.verdicts.modality.find((v) => v.modality === "responsive-web");
const widthsOf = (r) => [...new Set(r.runs.map((x) => x.width))];
const cli = (args) => new Promise((done) => {
  const c = spawn(process.execPath, [join(PKG, "cli.mjs"), ...args], { cwd: tmp });
  let stdout = "", stderr = "";
  c.stdout.on("data", (d) => { stdout += d; }); c.stderr.on("data", (d) => { stderr += d; });
  c.on("close", (status) => done({ status, stdout, stderr }));
});
// A page as the audit sees it, at each width: AppShell's navigations shown and its item count, a main landmark, fit.
const shellAt = (width, { bar, side, nav = 3 }) => ({ width, appShell: { bar, side, nav }, main: true, fits: true });
const verdict = (pages, more = {}) => modalityVerdicts({ modalities: { names: ["responsive-web"], widths: [390, 768, 1280], ...more.modalities }, pages, families: {}, layout: true, blueprint: more.blueprint ?? null })[0];
const ONE = { ...BLUEPRINT, destinations: [{ id: "home", label: "Home", screen: "home" }] };

describe("US-157: the modality is judged by what the app does, at the size classes it chose", () => {
  // @covers US-157-AC1
  test("AC1: a page framed by a main landmark that fits, or AppShell with no navigation, passes responsive-web", async () => {
    const plain = web(await run(["/web-plain.html"], { modalities: ["responsive-web"] }));
    assert.equal(plain.status, "pass", plain.fixes.join("\n"));
    assert.deepEqual(plain.components[0], { name: "AppShell", present: false, required: false, alternative: "main", framed: true, navigation: false });
    assert.ok(plain.evidence.some((x) => /web-plain\.html: no AppShell; its main landmark frames the page and the content fits at 390px, 768px, 1280px/.test(x)), plain.evidence.join("\n"));
    // AppShell with no navigation items: a single destination, nothing to adapt.
    const single = web(await run(["/web-single.html"], { modalities: ["responsive-web"] }));
    assert.equal(single.status, "pass", single.fixes.join("\n"));
    assert.equal(single.components[0].navigation, false);
    assert.equal("adapts" in single.components[0], false);
    assert.ok(single.evidence.includes("AppShell shows no navigation items: no navigation to adapt"));
    // A blueprint with one top-level destination: the navigation check does not apply, whatever the strip shows.
    const frozen = [{ url: "http://x/", widths: [shellAt(390, { bar: true, side: false }), shellAt(1280, { bar: true, side: false })] }];
    const one = verdict(frozen, { blueprint: ONE });
    assert.equal(one.status, "pass", one.fixes.join("\n"));
    assert.ok(one.evidence.includes("One top-level destination: no navigation to adapt"));
    // Where navigation exists it must still adapt.
    assert.equal(verdict(frozen, { blueprint: BLUEPRINT }).status, "warn");
    assert.equal(verdict([{ url: "http://x/", widths: [shellAt(390, { bar: true, side: false }), shellAt(1280, { bar: false, side: true })] }]).components[0].adapts, true);
  });

  // @covers US-157-AC2
  test("AC2: only the chosen size classes' widths are audited, and an unchosen one is never reported unchecked", async () => {
    assert.deepEqual(widthsFor(["responsive-web"]), [390, 768, 1280]);
    assert.deepEqual(widthsFor(["responsive-web"], ["compact", "expanded"]), [390, 1280]);
    assert.deepEqual(widthsFor(["responsive-web"], ["compact"]), [390]);
    assert.deepEqual(widthsFor(["responsive-web"], ["large"]), [1600]);
    assert.deepEqual(widthsFor(["chat"], ["compact", "medium", "expanded"]), [390, 1280]);
    const chosen = { ...BLUEPRINT, supports: { ...BLUEPRINT.supports, sizeClasses: ["compact", "expanded"] } };
    const r = await run(["/web.html"], { blueprint: chosen });
    assert.deepEqual(widthsOf(r), [390, 1280]);
    assert.deepEqual(r.modalities.sizeClasses, ["compact", "expanded"]);
    const v = web(r);
    assert.equal(v.status, "pass", v.fixes.join("\n"));
    assert.equal(v.components[0].adapts, true);
    assert.ok(!v.fixes.some((x) => /medium|768/.test(x)), v.fixes.join("\n"));
    // Compact only: the bottom bar at 390 is the whole check; nothing asks for an expanded width.
    const compact = verdict([{ url: "http://x/", widths: [shellAt(390, { bar: true, side: false })] }], { modalities: { widths: [390], sizeClasses: ["compact"] } });
    assert.deepEqual([compact.status, compact.components[0].adapts, compact.fixes], ["pass", true, []]);
    // Medium only: no navigation check is asked for at all.
    const medium = verdict([{ url: "http://x/", widths: [shellAt(768, { bar: false, side: false })] }], { modalities: { widths: [768], sizeClasses: ["medium"] } });
    assert.deepEqual([medium.status, medium.fixes], ["pass", []]);
    // On the command line, when no blueprint names them.
    const out = join(tmp, "cli-sizes");
    const c = await cli(["--modality", "responsive-web", "--size-classes", "compact,expanded", "--theme", "praxis-carbon", "--appearance", "light", "--no-contrast", "--fail-on", "never", "--out", out, apps.url("/web.html")]);
    assert.equal(c.status, 0, c.stdout + c.stderr);
    assert.deepEqual([...new Set(JSON.parse(readFileSync(join(out, "report.json"), "utf8")).runs.map((x) => x.width))], [390, 1280]);
    const bad = await cli(["--size-classes", "huge", apps.url("/web.html")]);
    assert.equal(bad.status, 2);
    assert.match(bad.stderr, /"huge" is not a size class; use compact, medium, expanded, large/);
  });

  // @covers US-157-AC3
  test("AC3: the verdict says which outcome failed, and never that AppShell is missing when another frame passes", async () => {
    const over = web(await run(["/web-overflow.html"], { modalities: ["responsive-web"] }));
    assert.equal(over.status, "fail");
    assert.ok(over.fixes.some((x) => /web-overflow\.html: content overflows at 390px, 768px: let it wrap/.test(x)), over.fixes.join("\n"));
    assert.ok(!over.fixes.some((x) => /AppShell is missing/.test(x)), over.fixes.join("\n"));
    const plain = web(await run(["/web-plain.html"], { modalities: ["responsive-web"] }));
    assert.ok(![...plain.fixes, ...plain.evidence].some((x) => /AppShell is missing|missing/.test(x)), plain.fixes.join("\n"));
    // Navigation that does not adapt says so, naming the outcome.
    const frozen = verdict([{ url: "http://x/", widths: [shellAt(390, { bar: true, side: false }), shellAt(1280, { bar: true, side: false })] }]);
    assert.match(frozen.fixes[0], /^Navigation exists, and AppShell's navigation does not adapt by size class/);
    // With neither AppShell nor a main landmark, AppShell is what is missing.
    const none = verdict([{ url: "http://x/", widths: [{ width: 390, appShell: null, main: false, fits: true }] }]);
    assert.equal(none.status, "fail");
    assert.match(none.fixes[0], /^AppShell is missing on http:\/\/x\/, and no main landmark frames the page instead/);
    // A reflow finding at a width counts as content that does not fit there.
    const reflow = modalityVerdicts({ modalities: { names: ["responsive-web"], widths: [390, 1280] }, pages: [{ url: "http://x/", widths: [{ width: 390, appShell: null, main: true, fits: true }, { width: 1280, appShell: null, main: true, fits: true }] }], findings: [{ id: 1, check: "reflow", url: "http://x/", severity: "warning", runs: ["praxis-carbon/light@390"] }], families: {} })[0];
    assert.match(reflow.fixes[0], /^http:\/\/x\/: content overflows at 390px:/);
  });
});
