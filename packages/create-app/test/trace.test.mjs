/* A new app's episode trace (FEAT-016 TRC-01, TRC-03, TRC-05, TRC-06;
   CONTRACT-007): creating it is its first episode; its .gitignore, its
   Claude Code hook, its lint script and its agent guidance are set up for
   the next ones.

     npm test --workspace @ux-builder/create-app */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { AGENT_GUIDE, GITIGNORE_LINES, currentEpisode, listEpisodes, readEpisode, validateEvent, validateTrace } from "@ux-builder/trace";
import { agentOf, create } from "../index.mjs";
import { bundle } from "./fixtures/helix-release.mjs";

const CLI = fileURLToPath(new URL("../index.mjs", import.meta.url));
const ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), "create-trace-"));
const BUNDLE = bundle("8.8.0");
const ENV = { ...process.env, UX_BUILDER_HELIX_API: "http://127.0.0.1:9", UX_BUILDER_HELIX_BUNDLE: BUNDLE, UX_BUILDER_AGENT: "", UX_BUILDER_MODEL: "", CLAUDECODE: "" };
after(() => { rmSync(tmp, { recursive: true, force: true }); rmSync(BUNDLE, { recursive: true, force: true }); });
const today = () => new Date().toISOString().slice(0, 10).replace(/-/g, "");
const sha = (p) => `sha256:${createHash("sha256").update(readFileSync(p, "utf8")).digest("hex")}`;

let dir, plain;
before(async () => {
  dir = join(tmp, "acme");
  const r = spawnSync(process.execPath, [CLI, dir, "--modality", "responsive-web,hybrid-chat", "--theme", "databricks", "--helix-offline", "--agent", "claude-code", "--model", "claude-opus-5-5"], { cwd: tmp, encoding: "utf8", env: ENV });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, new RegExp(`Episode trace: E-${today()}-create in \\.ux-builder/trace/`));
  plain = await create(join(tmp, "plain"), { modalities: ["chat"], helix: { skip: true } });
});

describe("US-105: creating the app is its first episode", () => {
  // @covers US-105-AC1
  test("AC1: .ux-builder/trace/ holds one episode whose first events are start (trigger create, agent and model, SDK and HELIX versions) and created", () => {
    const eps = listEpisodes(dir);
    assert.equal(eps.length, 1);
    assert.equal(eps[0].id, `E-${today()}-create`);
    assert.deepEqual(readdirSync(join(dir, ".ux-builder/trace")).sort(), [`E-${today()}-create.jsonl`], "closed: no current marker");
    const ev = readEpisode(dir, eps[0].id);
    const [start, created] = ev;
    assert.equal(start.kind, "start");
    assert.equal(start.trigger, "create");
    assert.deepEqual(start.agent, { name: "claude-code", model: "claude-opus-5-5" });
    const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    for (const p of ["@ux-builder/tokens", "@ux-builder/ui"]) assert.equal(start.sdk[p], pkg.dependencies[p], p);
    for (const p of ["@ux-builder/audit", "@ux-builder/trace"]) assert.equal(start.sdk[p], pkg.devDependencies[p], p);
    assert.equal(start.sdk["@ux-builder/create-app"], JSON.parse(readFileSync(join(ROOT, "packages/create-app/package.json"), "utf8")).version);
    assert.equal(start.helix, "8.8.0", "the HELIX it started on");
    assert.equal(start.commit, null, "not a git repository yet");
    assert.deepEqual(start.goal.stories, ["US-001"]);
    assert.equal(created.kind, "created");
    assert.deepEqual(created.modalities, ["responsive-web", "hybrid-chat"]);
    assert.equal(created.theme, "databricks");
    assert.equal(created.options.helix, "offline");
    assert.ok(created.files > 20, `${created.files} files`);
    assert.equal(created.blueprint, sha(join(dir, "app.blueprint.json")));
    // The rest of the episode: the guidance it gave, the blueprint's check, and its close.
    assert.deepEqual(ev.map((e) => e.kind), ["start", "created", "guidance", "check", "change", "outcome", "end"]);
    const g = ev[2];
    assert.equal(g.tool, "create-app");
    assert.equal(g.answer.guidanceHash, sha(join(dir, "AGENTS.md")));
    assert.ok(g.answer.components.includes("AppShell") || g.answer.components.length > 0);
    assert.deepEqual([ev[3].check, ev[3].attempt, ev[3].status], ["blueprint", 1, "pass"]);
    assert.deepEqual(ev[4].commits, []);
    assert.equal(ev[4].parent, null);
    assert.equal(ev[4].files, created.files, "outside git, the files written");
    assert.deepEqual(ev[5].checksToGreen, { blueprint: 1 });
    assert.equal(ev.at(-1).status, "done");
    assert.equal(currentEpisode(dir), null);
    assert.deepEqual(validateTrace(dir), []);
    // Without --agent, the agent is UX_BUILDER_AGENT, else Claude Code's, else unknown.
    assert.deepEqual(readEpisode(plain.dir, plain.episode)[0].agent, agentOf({}, process.env));
    assert.deepEqual(agentOf({}, { CLAUDECODE: "1" }), { name: "claude-code", model: null });
    assert.deepEqual(agentOf({}, { UX_BUILDER_AGENT: "codex", UX_BUILDER_MODEL: "gpt-x" }), { name: "codex", model: "gpt-x" });
    assert.deepEqual(agentOf({}, {}), { name: null, model: null });
    assert.equal(readEpisode(plain.dir, plain.episode)[0].helix, null, "--no-helix");
  });
});

describe("US-106: the trace is committed, and holds no source", () => {
  // @covers US-106-AC5
  test("AC5: .gitignore ignores only .ux-builder/trace/current of the trace", () => {
    const lines = readFileSync(join(dir, ".gitignore"), "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
    // The trace's own folders; .ux-builder/ also holds the design loop's files (FEAT-018), checked below.
    const trace = lines.filter((l) => /^\.?ux-builder\/(trace|transcripts)|^\.?ux-builder\/?$|^\.?\*/.test(l));
    assert.deepEqual(trace, GITIGNORE_LINES);
    assert.deepEqual(GITIGNORE_LINES, [".ux-builder/trace/current"]);
    // git agrees: the episode is committed, current is not.
    spawnSync("git", ["init", "-q"], { cwd: dir });
    const ignored = (p) => spawnSync("git", ["check-ignore", "-q", p], { cwd: dir }).status === 0;
    assert.equal(ignored(".ux-builder/trace/current"), true);
    assert.equal(ignored(`.ux-builder/trace/E-${today()}-create.jsonl`), false);
    assert.equal(ignored(".ux-builder/transcripts/E-1/1.jsonl"), false);
    // The design loop's state is committed; the real names behind research pseudonyms are not (ADR-039).
    assert.equal(ignored(".ux-builder/design-state.json"), false);
    assert.equal(ignored(".ux-builder/participants.local.json"), true);
    assert.equal(ignored(".ux-builder/config.json"), false);
  });

  // @covers US-106-AC4
  test("AC4: the create episode's events validate and hold no file's contents", () => {
    for (const app of [dir, plain.dir]) {
      const id = listEpisodes(app)[0].id;
      const raw = readFileSync(join(app, `.ux-builder/trace/${id}.jsonl`), "utf8");
      for (const e of readEpisode(app, id)) assert.deepEqual(validateEvent(e), [], e.kind);
      for (const f of ["src/App.jsx", "src/main.jsx", "app.blueprint.json", "AGENTS.md"]) {
        const text = readFileSync(join(app, f), "utf8");
        for (const line of text.split("\n").filter((l) => l.trim().length > 24)) assert.ok(!raw.includes(line.trim()), `${f}: "${line.trim()}" is in the trace`);
      }
    }
  });
});

describe("US-107: the agent is asked to record its decisions", () => {
  // @covers US-107-AC3
  test("AC3: AGENTS.md, CLAUDE.md and the skill say to open an episode, record a decision at each pattern choice, departure and workaround, add the trailer and end it", () => {
    const skill = readFileSync(join(ROOT, "packages/ui/skill/ux-builder-ui/SKILL.md"), "utf8");
    const sdkGuide = readFileSync(join(ROOT, "packages/ui/AGENTS.md"), "utf8");
    for (const [name, text] of [["AGENTS.md", readFileSync(join(dir, "AGENTS.md"), "utf8")], ["CLAUDE.md", readFileSync(join(dir, "CLAUDE.md"), "utf8")], ["the skill", skill], ["@ux-builder/ui's AGENTS.md", sdkGuide], ["--no-helix AGENTS.md", readFileSync(join(plain.dir, "AGENTS.md"), "utf8")]]) {
      assert.ok(text.includes(AGENT_GUIDE.trimEnd()), `${name}: the episode guide`);
      assert.match(text, /\*\*Open an episode\*\*[^\n]*`start_episode`/, name);
      assert.match(text, /npx ux-builder-trace start/, name);
      assert.match(text, /\*\*Record a decision\*\* at every pattern choice, every departure from the guidance and every\s+workaround for a missing component: the MCP tool `record_decision`/, name);
      assert.match(text, /`UX-Episode: <episode ID>`/, name);
      assert.match(text, /\*\*End the episode\*\*[^\n]*`end_episode`/, name);
    }
    assert.match(readFileSync(join(dir, "AGENTS.md"), "utf8"), /## HELIX[\s\S]*Each change is an episode in the trace/, "the HELIX guide points to it");
  });
});

describe("US-108: the transcript hook and the lint check", () => {
  // @covers US-108-AC1
  test("AC1: .claude/settings.json has a session-end hook running npx ux-builder-trace attach-transcript", () => {
    const settings = JSON.parse(readFileSync(join(dir, ".claude/settings.json"), "utf8"));
    assert.deepEqual(settings.hooks.SessionEnd, [{ hooks: [{ type: "command", command: "npx ux-builder-trace attach-transcript" }] }]);
    assert.ok(readdirSync(join(dir, ".claude/skills")).includes("helix"), "beside the HELIX skill");
  });

  test("npm run lint records each run as a lint check (ux-builder-trace lint)", () => {
    const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    assert.equal(pkg.scripts.lint, 'ux-builder-trace lint --stylelint "src/**/*.css" --eslint src');
    assert.ok(pkg.devDependencies["@ux-builder/trace"]);
  });
});
