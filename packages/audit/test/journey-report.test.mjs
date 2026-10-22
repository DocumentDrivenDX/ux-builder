/* The audit report by journey, with every rule spelled out (FEAT-015
   RPT-01 to RPT-04; US-100, US-101-AC2; CONTRACT-004 "Modalities, verdicts
   and the journey report"): the fixture blueprint's two journeys share the
   settings screen (found by its path) and leave the orphan screen out.

     npm run build && npm test --workspace @ux-builder/audit */

import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { audit } from "../audit.mjs";
import { html as renderHtml, rulesBroken, sections, writeReports } from "../report.mjs";
import { journeyIndex, pageScreen } from "../verdicts.mjs";
import { BLUEPRINT, modalityApps } from "./fixtures/modality-apps.mjs";

const PKG = fileURLToPath(new URL("..", import.meta.url));
const CATALOGUE = JSON.parse(readFileSync(join(PKG, "../ui/catalogue.json"), "utf8")).interaction.rules;
const tmp = mkdtempSync(join(tmpdir(), "audit-journeys-"));
let apps, r, html, flat;
before(async () => {
  apps = await modalityApps();
  r = await audit({ urls: ["/web.html", "/settings.html", "/orphan.html"].map((p) => apps.url(p)), themes: ["praxis-carbon"], blueprint: BLUEPRINT, out: tmp, cwd: PKG });
  writeReports(r, tmp);
  html = readFileSync(join(tmp, "index.html"), "utf8");
  flat = await audit({ urls: ["/web.html", "/settings.html"].map((p) => apps.url(p)), themes: ["praxis-carbon"], appearances: ["light"], cwd: PKG });
});
after(() => { apps?.close(); rmSync(tmp, { recursive: true, force: true }); });

const at = (s, from = 0) => html.indexOf(s, from);
const between = (start, end) => html.slice(at(start), end ? at(end, at(start) + 1) : undefined);

describe("US-100: read the audit by journey, with each rule spelled out", () => {
  // @covers US-100-AC1
  test("AC1: each journey, each step with its screen's screenshot, and under it every finding on that screen", () => {
    assert.deepEqual(r.pages.map((p) => [p.screen, p.screenVia]), [["home", "data-piq-screen"], ["settings", "path"], ["orphan", "path"]]);
    const setup = between('id="j-J-setup"', 'id="j-J-tour"');
    assert.match(setup, /<h3>Step 1: Home <code>home<\/code><\/h3>/);
    assert.match(setup, /<h3>Step 2: Settings <code>settings<\/code><\/h3>/);
    const step2 = setup.slice(setup.indexOf("Step 2: Settings"));
    const pink = r.findings.find((f) => f.check === "token-colors");
    assert.equal(pink.screen, "settings");
    assert.match(step2, /<img src="screens\/2-praxis-carbon-light-1280\.png"/, "the settings screen's screenshot");
    assert.ok(existsSync(join(tmp, "screens/2-praxis-carbon-light-1280.png")));
    for (const f of r.findings.filter((x) => x.screen === "settings")) assert.ok(step2.includes(`<span class="id">#${f.id}</span>`), `#${f.id} under the step`);
    assert.ok(!step2.includes(`#${r.findings.find((f) => f.screen === "orphan").id}<`), "nothing from another screen");
    // The settings screen is also J-tour's first step: shown there too.
    const tour = between('id="j-J-tour"', "Other screens");
    assert.match(tour, /Step 1: Settings/);
    assert.ok(tour.includes(`<span class="id">#${pink.id}</span>`));
    assert.deepEqual(journeyIndex(BLUEPRINT).map((j) => j.steps.map((s) => s.screen)), [["home", "settings"], ["settings"]]);
  });

  // @covers US-100-AC2
  test("AC2: each finding states its severity, the rule ID, the rule's full statement, its sources as links, the evidence and the fix", () => {
    const pink = r.findings.find((f) => f.check === "token-colors");
    const rule = CATALOGUE.find((x) => x.id === "theme.token-colors");
    const block = html.slice(at(`id="f-${pink.id}"`), at("</div></div>", at(`id="f-${pink.id}"`)));
    assert.match(block, /<span class="sev error">error<\/span>/);
    assert.ok(block.includes(`<code class="rid">theme.token-colors</code>`));
    assert.ok(block.includes(rule.statement.replace(/'/g, "'")), "the full statement");
    for (const s of rule.sources) assert.ok(block.includes(`<a href="${s.url}">${s.title}</a>`), s.title);
    assert.match(block, /<b>Evidence:<\/b> <code>#pink<\/code> · box <b>\d+<\/b> in the screenshot/);
    assert.match(block, /<b>Fix:<\/b> Use a --piq-color-\* role token/);
  });

  // @covers US-100-AC3
  test("AC3: findings on screens no journey visits are under Other screens; without journeys, the report groups by screen", () => {
    const other = between("<h2>Other screens</h2>", 'id="checks"');
    const orphan = r.findings.filter((f) => f.screen === "orphan");
    assert.ok(orphan.length);
    assert.match(other, /Orphan <code>orphan<\/code>/);
    for (const f of orphan) assert.ok(other.includes(`<span class="id">#${f.id}</span>`), `#${f.id}`);
    assert.ok(!other.includes("<code>settings</code>"), "settings is on a journey");
    // No blueprint: one section per screen (page), in order.
    const s = sections(flat);
    assert.deepEqual([s.journeys.length, s.other], [0, false]);
    assert.deepEqual(s.screens.map((x) => x.screen ?? x.key), ["home", apps.url("/settings.html")]);
    const plain = renderHtml(flat);
    assert.match(plain, /<h2>Screens<\/h2>/);
    assert.ok(plain.indexOf("Home <code>home</code>") < plain.indexOf("<code>/settings.html</code>"));
    assert.equal(pageScreen({ url: "http://x/a/settings.html/" }, { screens: [{ id: "settings", path: "/a/settings.html" }] }).screen, "settings", "a trailing slash is the same path");
  });

  // @covers US-100-AC4
  test("AC4: the verdicts come first, then the Rules broken table (rule, statement, count) linking to the findings; a screen on two journeys counts once", () => {
    const order = ['id="verdict-theme"', 'id="verdict-modality"', 'id="rules-broken"', 'id="j-J-setup"', 'id="j-J-tour"', "<h2>Other screens</h2>"].map((s) => at(s));
    assert.ok(order.every((x) => x > 0), JSON.stringify(order));
    assert.deepEqual([...order].sort((a, b) => a - b), order);
    const table = between('id="rules-broken"', "</table>");
    assert.match(table, /<th>Rule<\/th><th>Statement<\/th><th class="n">Findings<\/th>/);
    const colours = rulesBroken(r).find((b) => b.ruleId === "theme.token-colors");
    assert.equal(colours.findings.length, 1, "shown under two steps, counted once");
    assert.match(table, new RegExp(`<code>theme\\.token-colors</code>[\\s\\S]*?<td class="n">1</td><td><a href="#f-${colours.findings[0]}">#${colours.findings[0]}</a></td>`));
    assert.equal(html.split(`id="f-${colours.findings[0]}"`).length, 2, "one anchor per finding");
  });

  // @covers US-100-AC5
  // @covers US-101-AC2
  test("AC5 / US-101-AC2: report.json's findings carry ruleId, rule.statement, sources and fix, and with journeys their journey and step", () => {
    const json = JSON.parse(readFileSync(join(tmp, "report.json"), "utf8"));
    for (const f of json.findings) {
      const rule = CATALOGUE.find((x) => x.id === f.ruleId);
      assert.ok(rule, `${f.check}: ${f.ruleId} is a catalogue rule`);
      assert.equal(f.rule.statement, rule.statement);
      assert.deepEqual(f.sources, rule.sources.map(({ title, url }) => ({ title, url })));
      assert.deepEqual(f.rule.sources, f.sources);
      assert.ok(f.fix?.length > 10, `${f.check} has a fix`);
      assert.ok(rule.checks.some((c) => c.kind === "audit" && c.id === f.check));
    }
    const pink = json.findings.find((f) => f.check === "token-colors");
    assert.deepEqual([pink.journey, pink.step, pink.steps], ["J-setup", 2, [{ journey: "J-setup", step: 2 }, { journey: "J-tour", step: 1 }]]);
    assert.equal(json.findings.find((f) => f.screen === "orphan").journey, undefined);
    const contrast = json.findings.find((f) => f.check === "contrast");
    assert.equal(contrast.ruleId, "theme.contrast");
    assert.deepEqual(contrast.sources.map((s) => s.title), ["WCAG 2.2: 1.4.3 Contrast (Minimum)", "WCAG 2.2: 1.4.11 Non-text Contrast"]);
    assert.match(contrast.fix, new RegExp(`^Measured ${contrast.measured.ratio}:1; it needs at least ${contrast.measured.required.replace(".", "\\.")}`));
  });
});
