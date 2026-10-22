/* The audit's modality-fit and theme verdicts (FEAT-014 MOD-08 to MOD-10;
   US-099; CONTRACT-004 "Modalities, verdicts and the journey report"), on
   the fixture apps in fixtures/modality-apps.mjs: a clean twin of each
   modality and one page per seeded defect.

     npm run build && npm test --workspace @ux-builder/audit */

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { expandModalities } from "@ux-builder/ui/blueprint/modalities";
import { audit, modalitiesOf, RULES } from "../audit.mjs";
import { modalityVerdicts } from "../verdicts.mjs";
import { BLUEPRINT, modalityApps } from "./fixtures/modality-apps.mjs";

const PKG = fileURLToPath(new URL("..", import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), "audit-modality-"));
let apps;
before(async () => { apps = await modalityApps(); });
after(() => { apps?.close(); rmSync(tmp, { recursive: true, force: true }); });

const run = (pages, more = {}) => audit({ urls: pages.map((p) => apps.url(p)), themes: ["praxis-carbon"], cwd: PKG, ...more });
const widthsOf = (r) => [...new Set(r.runs.map((x) => x.width))];
const cli = (args) => new Promise((done) => {
  const c = spawn(process.execPath, [join(PKG, "cli.mjs"), ...args], { cwd: tmp });
  let stdout = "", stderr = "";
  c.stdout.on("data", (d) => { stdout += d; }); c.stderr.on("data", (d) => { stderr += d; });
  c.on("close", (status) => done({ status, stdout, stderr }));
});

describe("US-099: the audit says whether the app fits its theme and modalities", () => {
  // @covers US-099-AC1
  test("AC1: the blueprint's modalities choose the widths of FEAT-014's matrix and the rule families", async () => {
    const chat = await run(["/chat.html"], { blueprint: { ...BLUEPRINT, supports: { ...BLUEPRINT.supports, modalities: ["chat"] } } });
    assert.deepEqual(chat.modalities.names, ["chat"]);
    assert.equal(chat.modalities.source, "blueprint");
    assert.deepEqual(widthsOf(chat), expandModalities(["chat"]).widths);
    assert.deepEqual(widthsOf(chat), [390, 1280]);
    // chat's families leave out nav, modal and emphasis: their checks do not run; ai's and theme's do.
    for (const c of ["nav-per-breakpoint", "one-modal", "modal-contract", "one-primary-action"]) assert.ok(chat.modalities.off.includes(c), c);
    for (const c of ["ai-disclose", "token-colors", "contrast", "target-size", "line-length"]) assert.ok(!chat.modalities.off.includes(c), c);
    assert.ok(chat.modalities.off.includes("card-input-label"), "card.* is hybrid-chat's only");
    const web = await run(["/web.html"], { blueprint: BLUEPRINT });
    assert.deepEqual(widthsOf(web), [390, 768, 1280]);
    assert.ok(web.modalities.off.includes("ai-disclose") && !web.modalities.off.includes("nav-per-breakpoint"));
    // --modality on the command line, when no blueprint names them.
    const out = join(tmp, "cli-chat");
    const r = await cli(["--modality", "chat", "--theme", "praxis-carbon", "--appearance", "light", "--out", out, apps.url("/chat.html")]);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const json = JSON.parse(readFileSync(join(out, "report.json"), "utf8"));
    assert.deepEqual([json.modalities.names, json.modalities.source], [["chat"], "option"]);
    assert.deepEqual([...new Set(json.runs.map((x) => x.width))], [390, 1280]);
    assert.match(r.stdout, /Modality chat: pass/);
    const bad = await cli(["--modality", "ios", apps.url("/chat.html")]);
    assert.equal(bad.status, 2);
    assert.match(bad.stderr, /"ios" is a future modality.*Available now: responsive-web, chat, hybrid-chat/);
  });

  // @covers US-099-AC2
  test("AC2: a chat or hybrid-chat page with no SDK Conversation fails its verdict, naming the component and the fix", async () => {
    for (const m of ["chat", "hybrid-chat"]) {
      const r = await run(["/chat-missing.html"], { modalities: [m] });
      const [v] = r.verdicts.modality;
      assert.equal(v.modality, m);
      assert.equal(v.status, "fail");
      assert.deepEqual(v.components.find((c) => c.name === "Conversation"), { name: "Conversation", present: false, required: true });
      assert.ok(v.fixes.some((x) => /^Conversation is missing: Render the SDK's Conversation \(@ux-builder\/ui\/assistant\)/.test(x)), v.fixes.join("\n"));
    }
  });

  // @covers US-099-AC3
  test("AC3: hybrid-chat with no Adaptive Card part, and AppShell navigation that does not adapt, warn naming what is missing", async () => {
    const card = (await run(["/hybrid-no-card.html"], { modalities: ["hybrid-chat"] })).verdicts.modality[0];
    assert.equal(card.status, "warn");
    assert.deepEqual(card.components.map((c) => [c.name, c.present]), [["Conversation", true], ["Adaptive Card part", false]]);
    assert.ok(card.fixes.some((x) => /^Adaptive Card part is missing/.test(x)));
    const frozen = (await run(["/web-frozen.html"], { modalities: ["responsive-web"] })).verdicts.modality[0];
    assert.equal(frozen.status, "warn");
    assert.equal(frozen.components[0].adapts, false);
    assert.ok(frozen.fixes.some((x) => /navigation does not adapt by size class/.test(x)), frozen.fixes.join("\n"));
    assert.ok(frozen.evidence.some((x) => /at 1280px: bottom bar$/.test(x)), frozen.evidence.join("\n"));
    // And, as a pure function: no AppShell at all fails.
    const none = modalityVerdicts({ modalities: { names: ["responsive-web"], widths: [390, 1280] }, pages: [{ url: "http://x/", widths: [{ width: 390, appShell: null }] }], families: {} })[0];
    assert.equal(none.status, "fail");
    assert.match(none.fixes[0], /^AppShell is missing/);
  });

  // @covers US-099-AC4
  test("AC4: the theme verdict states the declared theme, whether it applies, its design system, SDK-only components and contrast per appearance, each failure with its theme.* rule", async () => {
    const r = await run(["/settings.html", "/orphan.html"], { modalities: ["responsive-web"] });
    const t = r.verdicts.theme;
    assert.equal(t.theme, "praxis-carbon");
    assert.equal(t.designSystem, "carbon");
    assert.equal(t.applied, true);
    assert.equal(t.sdkOnly, true);
    assert.deepEqual(t.contrast, { light: "fail", dark: "fail" });
    assert.equal(t.status, "fail");
    const item = (k) => t.items.find((i) => i.item === k);
    assert.deepEqual(item("designSystem").rules, ["theme.token-colors"]);
    assert.deepEqual(item("contrast").rules, ["theme.contrast"]);
    assert.match(item("contrast").fix, /^Measured \d+(\.\d+)?:1; it needs at least 4\.5:1\./);
    for (const i of t.items.filter((x) => x.status === "fail")) assert.ok(i.rules.length && i.rules.every((id) => id.startsWith("theme.")), i.item);
    assert.deepEqual([...t.findings].sort(), r.findings.filter((f) => f.ruleId?.startsWith("theme.")).map((f) => f.id).sort());
    // A page that names no theme applied, and foreign components, say so.
    assert.equal(item("sdkOnly").status, "pass");
  });

  // @covers US-099-AC5
  test("AC5: the clean fixture of each modality passes both verdicts", async () => {
    for (const [page, m] of [["/web.html", "responsive-web"], ["/chat.html", "chat"], ["/hybrid.html", "hybrid-chat"]]) {
      const r = await run([page], { modalities: [m], appearances: ["light", "dark"] });
      const brief = JSON.stringify({ verdicts: r.verdicts, findings: r.findings.map((f) => `${f.check} ${f.selector} ${f.message}`) }, null, 1);
      assert.equal(r.verdicts.theme.status, "pass", brief);
      assert.deepEqual(r.verdicts.modality.map((v) => [v.modality, v.status]), [[m, "pass"]], brief);
      assert.deepEqual(r.verdicts.theme.contrast, { light: "pass", dark: "pass" });
    }
  });

  test("with no blueprint modalities and no --modality, responsive-web is assumed and the verdict says so", async () => {
    assert.deepEqual(modalitiesOf({}), { names: ["responsive-web"], source: "assumed", assumed: true });
    assert.deepEqual(modalitiesOf({ blueprint: { supports: ["expanded"] }, modalities: ["chat"] }).names, ["chat"], "an old blueprint's supports names no modality");
    const r = await run(["/web.html"], { appearances: ["light"] });
    assert.equal(r.modalities.assumed, true);
    assert.deepEqual(r.runs.map((x) => x.width), [undefined], "assumed: the widths --width gives, as before");
    assert.match(r.verdicts.modality[0].note, /responsive-web was assumed/);
    assert.equal(r.verdicts.modality[0].components[0].adapts, null, "not checked at one width");
    assert.ok(Object.keys(RULES).every((c) => !r.modalities.off.includes(c)), "every check runs");
  });

  test("the report says it in HTML and JSON", async () => {
    const out = join(tmp, "html");
    const r = await cli(["--modality", "hybrid-chat", "--theme", "praxis-carbon", "--appearance", "light", "--out", out, apps.url("/hybrid-no-card.html")]);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(existsSync(join(out, "index.html")));
    const html = readFileSync(join(out, "index.html"), "utf8");
    assert.ok(html.indexOf('id="verdict-theme"') < html.indexOf('id="verdict-modality"') && html.indexOf('id="verdict-modality"') < html.indexOf('id="rules-broken"'));
    assert.match(html, /Adaptive Card part <b>missing<\/b>/);
  });
});
