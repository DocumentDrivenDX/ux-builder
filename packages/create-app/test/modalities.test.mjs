/* The starter asks for the app's modalities and makes the empty shell for
   them (FEAT-014 MOD-01 to MOD-05; US-096, US-097; CONTRACT-004 Modalities).

     npm test --workspace @ux-builder/create-app */

import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { PassThrough } from "node:stream";
import { after, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { checkBlueprint, skeleton } from "@ux-builder/ui/blueprint";
import { checkCard } from "@ux-builder/ui/adaptive-cards/check";
import { MODALITIES, expandModalities } from "@ux-builder/ui/blueprint/modalities";
import { askModalities, create, parseModalities, resolveModalities, scaffold, uncite } from "../index.mjs";
import { criteria, shellFiles, starterSpec } from "../shell.mjs";
import { bundle } from "./fixtures/helix-release.mjs";

const CLI = fileURLToPath(new URL("../index.mjs", import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), "modalities-"));
const BUNDLE = bundle("8.8.0");
process.env.UX_BUILDER_HELIX_BUNDLE = BUNDLE;
after(() => { rmSync(tmp, { recursive: true, force: true }); rmSync(BUNDLE, { recursive: true, force: true }); });
const ENV = { ...process.env, UX_BUILDER_HELIX_API: "http://127.0.0.1:9", UX_BUILDER_HELIX_BUNDLE: BUNDLE };
const run = (...args) => spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8", cwd: tmp, env: ENV, stdio: ["ignore", "pipe", "pipe"] });
const blueprint = (dir) => JSON.parse(readFileSync(join(tmp, dir, "docs/ux-builder/blueprint/app.blueprint.json"), "utf8"));
const files = (dir) => readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).map((e) => relative(dir, join(e.parentPath ?? e.path, e.name)));
const ALL = [["responsive-web"], ["chat"], ["hybrid-chat"], ["responsive-web", "hybrid-chat"], ["chat", "hybrid-chat"], ["responsive-web", "chat", "hybrid-chat"]];

/* The CLI in a pseudo-terminal (Python's pty module), answering its question with `answer`. */
function inTerminal(args, answer) {
  return new Promise((done) => {
    const p = spawn("python3", ["-c", "import pty, sys; sys.exit(pty.spawn(sys.argv[1:]) >> 8)", process.execPath, CLI, ...args], { cwd: tmp, env: ENV });
    let out = "";
    let sent = false;
    p.stdout.on("data", (d) => { out += d; if (!sent && /Modalities: /.test(out)) { sent = true; p.stdin.write(`${answer}\n`); } });
    p.stderr.on("data", (d) => { out += d; });
    p.on("close", (status) => done({ status, out }));
  });
}
const hasPty = spawnSync("python3", ["-c", "import pty"]).status === 0;

describe("US-096: choose the app's modalities when creating it", () => {
  // @covers US-096-AC1
  test("AC1: in a terminal with no --modality, it asks as a multi-select and creates the app for the ones chosen", { skip: !hasPty && "no python3 pty for a pseudo-terminal" }, async () => {
    const r = await inTerminal(["asked", "--no-helix"], "1,3");
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /Which modalities does the app have\?[\s\S]*1\. responsive-web[\s\S]*2\. chat[\s\S]*3\. hybrid-chat/);
    assert.deepEqual(blueprint("asked").supports.modalities, ["responsive-web", "hybrid-chat"]);
    assert.ok(existsSync(join(tmp, "asked/src/Home.jsx")) && existsSync(join(tmp, "asked/src/Assistant.jsx")));
  });

  // @covers US-096-AC1
  test("AC1: the multi-select takes numbers or names, asks again on an answer it cannot use, and refuses when the input ends", async () => {
    const input = new PassThrough(), output = new PassThrough();
    let said = "";
    output.on("data", (d) => { said += d; });
    const answer = askModalities({ input, output });
    input.write("7\n");
    input.write("chat, 3\n");
    assert.deepEqual(await answer, ["chat", "hybrid-chat"]);
    assert.match(said, /"7" is not a modality[\s\S]*Modalities: /);
    const none = new PassThrough();
    const ended = askModalities({ input: none, output: new PassThrough() });
    none.end();
    await assert.rejects(ended, /no modalities were chosen; no app was created/);
  });

  // @covers US-096-AC2
  test("AC2: --modality responsive-web,hybrid-chat does not ask, and the blueprint has exactly those, with the matrix's size classes and inputs", () => {
    const r = run("given", "--modality", "responsive-web,hybrid-chat", "--no-helix");
    assert.equal(r.status, 0, r.stderr);
    assert.doesNotMatch(r.stdout, /Which modalities/);
    const bp = blueprint("given");
    const x = expandModalities(["responsive-web", "hybrid-chat"]);
    assert.deepEqual(bp.supports, { modalities: ["responsive-web", "hybrid-chat"], sizeClasses: x.sizeClasses, inputs: x.inputs });
    assert.deepEqual(bp.supports.sizeClasses, ["compact", "medium", "expanded", "large"]);
    assert.deepEqual(bp.screens.find((s) => s.id === "assistant").ai.roles, ["assistant"]);
    assert.deepEqual(checkBlueprint(bp), []);
  });

  // @covers US-096-AC3
  test("AC3: no terminal and no --modality: exit 1 listing the modalities, nothing written, none assumed", () => {
    const r = run("unasked", "--no-helix");
    assert.equal(r.status, 1);
    for (const m of Object.keys(MODALITIES)) assert.match(r.stderr, new RegExp(`^  ${m} `, "m"));
    assert.match(r.stderr, /--modality <list>[\s\S]*No app was created/);
    assert.equal(existsSync(join(tmp, "unasked")), false);
    assert.throws(() => scaffold(join(tmp, "lib"), {}), /modalities are required/);
    assert.equal(existsSync(join(tmp, "lib")), false);
  });

  // @covers US-096-AC4
  test("AC4: ios or an unknown name: exit 1 saying which are available now and that native apps are future", () => {
    for (const [m, what] of [["ios", /"ios" is a future modality/], ["kiosk", /"kiosk" is not a modality/], ["chat,windows", /"windows" is a future modality/]]) {
      const r = run(`bad-${m}`, "--modality", m, "--no-helix");
      assert.equal(r.status, 1, m);
      assert.match(r.stderr, what);
      assert.match(r.stderr, /Available now: responsive-web, chat, hybrid-chat/);
      assert.match(r.stderr, /Native apps \(ios, android, macos, windows\) are future modalities/);
      assert.equal(existsSync(join(tmp, `bad-${m}`)), false);
    }
    assert.throws(() => parseModalities(""), /Name at least one modality/);
  });

  // @covers US-096-AC5
  test("AC5: --blueprint whose supports.modalities differs from --modality: exit 1 naming both", () => {
    const plan = { ...skeleton("app"), name: "Planned", supports: { ...skeleton("app").supports, modalities: ["responsive-web"] } };
    writeFileSync(join(tmp, "plan.json"), JSON.stringify(plan));
    const r = run("disagree", "--blueprint", "plan.json", "--modality", "chat", "--no-helix");
    assert.equal(r.status, 1);
    assert.match(r.stderr, /--modality chat disagrees with --blueprint plan\.json, whose supports\.modalities is responsive-web/);
    assert.equal(existsSync(join(tmp, "disagree")), false);
    // Agreeing, or the blueprint's own when --modality is left out; one naming none is read as responsive-web.
    assert.deepEqual(resolveModalities({ modality: "responsive-web", blueprint: join(tmp, "plan.json") }), ["responsive-web"]);
    assert.deepEqual(resolveModalities({ blueprint: join(tmp, "plan.json") }), ["responsive-web"]);
    writeFileSync(join(tmp, "old.json"), JSON.stringify(skeleton("app")));
    assert.match(run("old", "--blueprint", "old.json", "--modality", "chat", "--no-helix").stderr, /names none, so it is read as responsive-web/);
    const ok = run("agree", "--blueprint", "plan.json", "--no-helix");
    assert.equal(ok.status, 0, ok.stderr);
    assert.deepEqual(blueprint("agree"), plan);
  });
});

describe("US-097: start from an empty shell for the modalities", () => {
  // @covers US-097-AC1
  test("AC1: no sample domain in any file, and src/ has only the shell, the theme switch and the providers", () => {
    for (const ms of ALL) {
      const r = scaffold(join(tmp, `shell-${ms.join("-")}`), { name: "acme", modalities: ms });
      const src = r.files.filter((f) => f.startsWith("src/")).sort();
      const expected = ["src/App.css", ...Object.keys(shellFiles(ms)), "src/ThemeSwitch.jsx", "src/main.jsx"].sort();
      assert.deepEqual(src, expected, ms.join());
      for (const f of files(r.dir)) {
        const text = readFileSync(join(r.dir, f), "utf8");
        assert.doesNotMatch(text, /\bmatters?\b|invoice|Halvorsen|Okafor|Brightwater|partner/i, `${ms.join()}: ${f}`);
      }
      assert.doesNotMatch(readFileSync(join(r.dir, "src/main.jsx"), "utf8"), /DataTable|rows/);
      assert.deepEqual(checkBlueprint(JSON.parse(readFileSync(join(r.dir, "docs/ux-builder/blueprint/app.blueprint.json"), "utf8"))), [], ms.join());
    }
  });

  test("the shell's parts: Home is an AppShell's empty StatePanel; the assistant an SDK Conversation; hybrid-chat's reply a card that passes checkCard", () => {
    const home = readFileSync(new URL("../shells/Home.jsx", import.meta.url), "utf8");
    assert.match(home, /<StatePanel kind="empty"[\s\S]*Frame the first feature in HELIX[\s\S]*app\.blueprint\.json/);
    assert.match(readFileSync(new URL("../shells/App.web.jsx", import.meta.url), "utf8"), /<AppShell nav=\{NAV\}/);
    assert.match(readFileSync(new URL("../shells/App.both.jsx", import.meta.url), "utf8"), /label: "Home"[\s\S]*label: "Assistant"/);
    for (const f of ["Assistant.chat.jsx", "Assistant.hybrid-chat.jsx"]) assert.match(readFileSync(new URL(`../shells/${f}`, import.meta.url), "utf8"), /import \{ Conversation \} from "@ux-builder\/ui\/assistant"/);
    const hybrid = readFileSync(new URL("../shells/Assistant.hybrid-chat.jsx", import.meta.url), "utf8");
    assert.match(hybrid, /type: "adaptive-card", card: NOT_CONNECTED/);
    const card = Function(`return (${/const NOT_CONNECTED = (\{[\s\S]*?\n\});/.exec(hybrid)[1]})`)();
    assert.deepEqual(checkCard(card).filter((f) => f.severity === "error"), []);
    assert.deepEqual(shellFiles(["chat", "hybrid-chat"]), { "src/App.jsx": "App.chat.jsx", "src/Assistant.jsx": "Assistant.hybrid-chat.jsx" }, "one conversation that draws cards");
  });

  // @covers US-097-AC5
  test("AC5: FEAT-001 is the shell for the modalities; US-001 has one criterion per modality's shell; the e2e test cites them", async () => {
    for (const ms of [["chat"], ["responsive-web", "hybrid-chat"]]) {
      const r = await create(join(tmp, `docs-${ms.join("-")}`), { name: "acme", modalities: ms, helix: { offline: true } });
      const doc = (p) => readFileSync(join(r.dir, "docs/helix", p), "utf8");
      const feat = doc("01-frame/features/FEAT-001-app-shell.md");
      assert.match(feat, /^# Feature Specification: FEAT-001 — The app's shell for its modalities$/m);
      for (const m of ms) assert.match(feat, new RegExp(`\\*\\*\`${m}\`\\*\\*: ${MODALITIES[m].shell}`), m);
      const story = doc("01-frame/user-stories/US-001-open-the-app-and-see-where-to-start.md");
      assert.match(story, /^# US-001: Open the app and see where to start$/m);
      const acs = [...story.matchAll(/\*\*(US-001-AC\d+)\*\* — (.*)/g)];
      assert.equal(acs.length, ms.length + 1, "one per modality's shell, then the theme switch");
      ms.forEach((m, i) => assert.match(acs[i][2], m === "responsive-web" ? /`AppShell`.*Home screen.*frame the first feature in HELIX/ : m === "chat" ? /full-screen `Conversation`/ : /Adaptive Card part/, m));
      const spec = readFileSync(join(r.dir, "e2e/starter.spec.js"), "utf8");
      for (const [, id] of acs) assert.match(spec, new RegExp(`^// @covers ${id}$`, "m"), id);
      assert.match(spec, /docs\/helix\/01-frame\/user-stories\/US-001-open-the-app-and-see-where-to-start\.md/);
    }
  });

  test("with --no-helix, the same shell and an e2e test with no @covers lines", async () => {
    const r = await create(join(tmp, "plain-shell"), { name: "acme", modalities: ["hybrid-chat"], helix: { skip: true } });
    const spec = readFileSync(join(r.dir, "e2e/starter.spec.js"), "utf8");
    assert.doesNotMatch(spec, /@covers|docs\/helix/);
    assert.equal(spec, uncite(starterSpec(["hybrid-chat"])));
    assert.equal((spec.match(/^test\(/gm) ?? []).length, criteria(["hybrid-chat"]).length);
    assert.ok(existsSync(join(r.dir, "src/Assistant.jsx")) && !existsSync(join(r.dir, "src/Home.jsx")));
  });

  test("the agent guidance names the app's modalities, their components and rule families", () => {
    const r = scaffold(join(tmp, "guide"), { name: "acme", modalities: ["chat"] });
    for (const f of ["AGENTS.md", "CLAUDE.md"]) {
      const t = readFileSync(join(r.dir, f), "utf8");
      assert.match(t, /modalities are `chat`/);
      assert.match(t, /`@ux-builder\/ui\/assistant`/);
      assert.match(t, /`ai\.\*`, `feedback\.\*`, `input\.\*`, `text\.\*`/);
      assert.match(t, /"modalities": \["chat"\]/);
      assert.doesNotMatch(t, /__MODALITY_GUIDE__/);
    }
  });
});
