/* The audit's AI checks (FEAT-011 AIM-01, AIA-01, AIA-02; US-078, US-079,
   US-080-AC3, AC6; SD-005; CONTRACT-005 AI markup): fixture pages in
   test/fixtures/ai, a clean twin of each AI screen and one page per seeded
   defect, loading the built @ux-builder/tokens and @ux-builder/ui CSS over
   HTTP.

     npm run build && npm test --workspace @ux-builder/audit */

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { rulesFor } from "@ux-builder/ui/blueprint";
import { AI_CHECKS, RULES, audit } from "../audit.mjs";

const PKG = fileURLToPath(new URL("..", import.meta.url));
const FIXTURES = join(PKG, "test/fixtures/ai");
const FILES = { "/themes.css": join(PKG, "../tokens/dist/themes.css"), "/fonts.css": join(PKG, "../tokens/dist/fonts.css"), "/ui.css": join(PKG, "../ui/dist/ui.css") };
const BLUEPRINT = JSON.parse(readFileSync(join(FIXTURES, "app.blueprint.json"), "utf8"));
const CATALOGUE = JSON.parse(readFileSync(join(PKG, "../ui/catalogue.json"), "utf8")).interaction.rules;
const tmp = mkdtempSync(join(tmpdir(), "audit-ai-"));
let server, base;

before(async () => {
  server = createServer((req, res) => {
    const path = new URL(req.url, "http://x").pathname;
    const fixture = join(FIXTURES, path.slice(1));
    if (path.endsWith(".html") && existsSync(fixture)) { res.writeHead(200, { "content-type": "text/html" }); res.end(readFileSync(fixture)); return; }
    const file = FILES[path] ?? (path.startsWith("/fonts/") || path.startsWith("/brand/") ? join(PKG, "../tokens/dist", path) : null);
    if (!file || !existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "content-type": { ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2" }[extname(file)] ?? "application/octet-stream" });
    res.end(readFileSync(file));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server?.close(); rmSync(tmp, { recursive: true, force: true }); });

const cliRun = (args) => new Promise((resolve) => {
  const c = spawn(process.execPath, [join(PKG, "cli.mjs"), ...args], { cwd: PKG });
  let stdout = "", stderr = "";
  c.stdout.on("data", (d) => { stdout += d; }); c.stderr.on("data", (d) => { stderr += d; });
  c.on("close", (status) => resolve({ status, stdout, stderr }));
});
const OPTS = { themes: ["praxis-carbon"], appearances: ["light"], contrast: false, rules: { brand: false } };
const run = (pages, more = {}) => audit({ urls: pages.map((p) => `${base}/${p}`), ...OPTS, ...more });
const AI = new Set(AI_CHECKS);
const ai = (r, page) => r.findings.filter((f) => AI.has(f.check) && (!page || f.url.endsWith(`/${page}`)));
const of = (r, rule, page) => ai(r, page).filter((f) => f.check === rule);
const brief = (fs) => JSON.stringify(fs.map(({ check, selector, message }) => ({ check, selector, message })), null, 1);
const CLEAN = ["clean-agent.html", "clean-done.html", "clean-chat.html", "clean-start.html"];

/* Each seeded defect page reports its check, and only it among the AI checks. */
async function seeded(page, rule, { also = [], selector, widths } = {}) {
  const r = await run([page], widths ? { widths } : {});
  const got = ai(r, page);
  assert.ok(got.some((f) => f.check === rule), `${page}: ${rule} expected; got ${brief(got)}`);
  assert.deepEqual([...new Set(got.map((f) => f.check))].sort(), [rule, ...also].sort(), `${page}: only ${[rule, ...also].join(", ")}; got ${brief(got)}`);
  if (selector) assert.ok(of(r, rule, page).some((f) => f.selector === selector), `${page}: ${rule} at ${selector}; got ${brief(got)}`);
  return of(r, rule, page);
}

describe("US-078: the audit checks marked AI content", () => {
  test("the clean twins report no AI finding, at every size class", async () => {
    const r = await run([...CLEAN, "inline-pattern-clean.html"], { widths: [360, 1280] });
    assert.deepEqual(ai(r), [], brief(ai(r)));
  });

  // @covers US-078-AC1
  test("AC1: generated content with no disclosure is reported; a labelled ancestor satisfies it", async () => {
    const [f] = await seeded("ai-disclose.html", "ai-disclose", { selector: "#answer" });
    assert.equal(f.ruleId, "ai.disclose");
    assert.match(f.message, /no visible disclosure/);
    // The clean twin's disclosure is on the conversation region, an ancestor (the edge case in US-078).
    assert.match(readFileSync(join(FIXTURES, "clean-chat.html"), "utf8"), /<section id="conversation"[^>]*data-piq-ai-label>/);
  });

  // @covers US-078-AC2
  test("AC2: a busy status region with no Stop in or beside it is reported", async () => {
    const [f] = await seeded("ai-stop.html", "ai-stop", { selector: "#status" });
    assert.equal(f.ruleId, "ai.stop");
    assert.match(f.message, /Stop or Pause/);
  });

  // @covers US-078-AC3
  test("AC3: an approval without Deny, or with Approve chosen for the user, is reported", async () => {
    const [missing] = await seeded("agent-approval.html", "agent-approval", { selector: "#approval" });
    assert.equal(missing.ruleId, "agent.approve-high-impact");
    assert.match(missing.message, /no deny control/);
    const [chosen] = await seeded("agent-approval-default.html", "agent-approval");
    assert.equal(chosen.property, "default");
    assert.match(chosen.message, /approve control is chosen for the user/);
  });

  // @covers US-078-AC4
  test("AC4: generated content with no retry, regenerate, edit or undo control is reported", async () => {
    const [f] = await seeded("ai-correct.html", "ai-correct", { selector: "#answer" });
    assert.equal(f.ruleId, "ai.correct");
  });

  // @covers US-078-AC5
  test("AC5: with --blueprint, AI content on a screen that declares no AI role is reported, naming the screen", async () => {
    const r = await run(["clean-chat.html", "clean-agent.html", "ai-correct.html"], { blueprint: BLUEPRINT });
    const chat = of(r, "ai-declared", "clean-chat.html");
    assert.equal(chat.length, 1, brief(chat));
    assert.equal(chat[0].ruleId, "ai.declared");
    assert.match(chat[0].message, /screen "chat" shows AI content and its blueprint declares no AI role/);
    assert.deepEqual(of(r, "ai-declared", "clean-agent.html"), [], "the agent screen declares its role");
    assert.match(of(r, "ai-declared", "ai-correct.html")[0]?.message ?? "", /names no blueprint screen; add data-piq-screen/);
    assert.deepEqual(of(await run(["clean-chat.html"]), "ai-declared"), [], "only with --blueprint");
    // The command reads the file.
    const out = join(tmp, "bp");
    const cli = await cliRun(["--theme", "praxis-carbon", "--appearance", "light", "--no-contrast", "--off", "brand", "--out", out, "--blueprint", join(FIXTURES, "app.blueprint.json"), `${base}/clean-chat.html`]);
    assert.equal(cli.status, 0, cli.stderr + cli.stdout);
    const json = JSON.parse(readFileSync(join(out, "report.json"), "utf8"));
    assert.ok(json.findings.some((f) => f.check === "ai-declared" && /"chat"/.test(f.message)));
    assert.equal((await cliRun(["--blueprint", join(tmp, "missing.json"), `${base}/clean-chat.html`])).status, 2);
  });

  // @covers US-078-AC6
  test("AC6: an app with no AI markers gets no AI finding", async () => {
    const r = await run(["no-markers.html"], { widths: [360, 1280], blueprint: BLUEPRINT });
    assert.deepEqual(ai(r), [], brief(ai(r)));
    assert.ok(r.findings.length > 0, "the other checks still run");
  });

  // @covers US-078-AC7
  test("AC7: each AI finding carries its rule ID and sources, and is a warning", async () => {
    const pages = readdirSync(FIXTURES).filter((f) => f.endsWith(".html") && !f.startsWith("clean-") && !f.startsWith("inline-") && f !== "no-markers.html");
    const r = await run(pages, { widths: [360], blueprint: BLUEPRINT, rules: { brand: false } });
    const found = ai(r);
    assert.deepEqual([...new Set(found.map((f) => f.check))].sort(), [...AI_CHECKS].sort(), "every AI check is seeded");
    for (const f of found) {
      assert.equal(f.severity, "warning", `${f.check} is a warning`);
      const rule = CATALOGUE.find((x) => x.id === f.ruleId);
      assert.ok(rule, `${f.check}: ${f.ruleId} is a catalogue rule`);
      assert.ok(rule.checks.some((c) => c.kind === "audit" && c.id === f.check), `${f.ruleId} names the audit check ${f.check}`);
      assert.ok(f.sources.length && f.sources.every((s) => s.title && /^https:/.test(s.url)), `${f.check} has sources`);
      assert.deepEqual(f.sources, rule.sources.map(({ title, url }) => ({ title, url })));
    }
    for (const c of AI_CHECKS) assert.ok(RULES[c], `${c} is a check --off can name`);
    const off = await run(["ai-disclose.html"], { rules: { brand: false, "ai-disclose": false } });
    assert.deepEqual(of(off, "ai-disclose"), [], "--off turns it off");
  });
});

describe("US-079: users can follow and steer an agent", () => {
  // @covers US-079-AC1
  test("AC1: a plan step whose status is not stated in text is reported", async () => {
    const [f] = await seeded("agent-plan.html", "agent-plan", { selector: "#step-1" });
    assert.equal(f.ruleId, "agent.plan-visible");
    assert.match(f.message, /status \(done\) is not stated in text/);
  });

  // @covers US-079-AC2
  test("AC2: a running agent with no reachable Pause or Stop is reported; one elsewhere on the page satisfies it", async () => {
    const [f] = await seeded("agent-interrupt.html", "agent-interrupt", { also: ["ai-stop"], selector: "#status" });
    assert.equal(f.ruleId, "agent.interrupt");
    await seeded("agent-interrupt-away.html", "ai-stop");
  });

  // @covers US-079-AC3
  test("AC3: takeover with no live region stating who acts is reported, from the page or the blueprint", async () => {
    const [f] = await seeded("agent-who-acts.html", "agent-who-acts", { selector: "#run" });
    assert.equal(f.ruleId, "agent.who-acts");
    // The blueprint's ai.takeover declares it too, without the page attribute.
    assert.ok(!readFileSync(join(FIXTURES, "agent-who-acts-declared.html"), "utf8").includes("data-piq-ai-takeover"));
    assert.deepEqual(ai(await run(["agent-who-acts-declared.html"])), [], "without --blueprint, nothing says it supports takeover");
    const r = await run(["agent-who-acts-declared.html"], { blueprint: BLUEPRINT });
    assert.deepEqual(ai(r).map((f) => [f.check, f.selector]), [["agent-who-acts", "#actor"]], brief(ai(r)));
  });

  // @covers US-079-AC4
  test("AC4: a failed step that does not say why, or offers no retry or previous step, is reported", async () => {
    const fs = await seeded("agent-recover.html", "agent-recover", { selector: "#step-2" });
    assert.deepEqual(fs.map((f) => f.property).sort(), ["control", "description"]);
    assert.ok(fs.every((f) => f.ruleId === "agent.recover"));
  });

  // @covers US-079-AC5
  test("AC5: a finished run with no summary is reported", async () => {
    const [f] = await seeded("agent-summary.html", "agent-summary", { selector: "#status" });
    assert.equal(f.ruleId, "agent.summary");
  });

  // @covers US-079-AC6
  test("AC6: the agent review rules (uncertainty, assumptions, attention) are returned for role agent with kind review and sources", () => {
    const got = rulesFor({ aiRoles: ["agent"] });
    for (const id of ["ai.uncertainty", "ai.ask-when-unclear", "agent.status-unwatched"]) {
      const r = got.find((x) => x.id === id);
      assert.ok(r, `${id} applies to agents`);
      assert.ok(r.checks.some((c) => c.kind === "review"), `${id} is reviewed`);
      assert.ok(r.sources.length && r.sources.every((s) => s.title && /^https:/.test(s.url)), `${id} has sources`);
    }
    // The rules the audit now checks are no longer review-only stand-ins (SD-005's Checks column).
    for (const id of ["agent.plan-visible", "agent.interrupt", "agent.who-acts", "agent.recover", "agent.summary"]) {
      const r = got.find((x) => x.id === id);
      assert.deepEqual(r.checks.map((c) => c.kind), ["audit"], id);
    }
  });
});

describe("US-080: a chat that renders UI inline", () => {
  // @covers US-080-AC3
  test("AC3: pre-filled inline UI that cannot be edited, or has no submit of its own, is reported", async () => {
    const [locked] = await seeded("genui-review-prefill.html", "genui-review-prefill", { selector: "#amount" });
    assert.equal(locked.ruleId, "genui.review-prefill");
    assert.equal(locked.property, "editable");
    const [shared] = await seeded("genui-review-prefill-submit.html", "genui-review-prefill", { selector: "#expense" });
    assert.equal(shared.property, "submit");
    assert.match(shared.message, /submitted with the conversation's message/);
  });

  // @covers US-080-AC6
  test("AC6: an inline pattern gets the page's own checks, and the rendered-card checks", async () => {
    const r = await run(["inline-pattern.html", "inline-pattern-clean.html"], { widths: [1280] });
    const inside = (f) => /#(answer|expense|submit-expense|save-draft|tiny)\b/.test(f.selector ?? "");
    const primary = r.findings.filter((f) => f.check === "one-primary-action" && f.url.endsWith("/inline-pattern.html"));
    assert.equal(primary.length, 1, brief(primary));
    assert.ok(inside(primary[0]), primary[0].selector);
    assert.match(primary[0].message, /"Submit expense", "Save draft"/);
    assert.ok(r.findings.some((f) => f.check === "target-size" && f.selector?.includes("#tiny")), "target-size inside generated UI");
    assert.deepEqual(r.findings.filter((f) => ["one-primary-action", "target-size"].includes(f.check) && f.url.endsWith("/inline-pattern-clean.html")), []);
    // The rendered-card checks: an input with only a placeholder; generated UI too wide for compact.
    const [label] = await seeded("card-input-label.html", "card-input-label", { selector: "#amount" });
    assert.equal(label.ruleId, "card.input-label");
    assert.match(label.message, /placeholder "Amount" is not a label/);
    const [wide] = await seeded("card-narrow-first.html", "card-narrow-first", { selector: "#answer", widths: [360, 1280] });
    assert.equal(wide.ruleId, "card.narrow-first");
    assert.deepEqual(wide.runs, ["praxis-carbon/light@360"], "at the compact size class only");
  });
});

describe("ai.starters", () => {
  test("an empty conversation with no starting points, or only starting points, is reported", async () => {
    const [none] = await seeded("ai-starters.html", "ai-starters", { selector: "#prompt" });
    assert.equal(none.ruleId, "ai.starters");
    assert.equal(none.property, "starters");
    const [closed] = await seeded("ai-starters-closed.html", "ai-starters");
    assert.equal(closed.property, "prompt");
  });
});
