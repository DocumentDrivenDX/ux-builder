/* Export (US-109), the schemas and the CONTRACT-007 validation checklist:
   a fixture episode with every kind validates and round-trips through export.

     npm test --workspace @ux-builder/trace */

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { appendEvent, attachTranscript, attemptOf, closeEpisode, exportBundle, KINDS, openEpisode, readBundle, readEpisode, validateBundle, validateEvent, validateTrace } from "../index.mjs";
import { cli, commit, git, PKG, SECRETS, tempApp, today } from "./helpers.mjs";

const NO_NETWORK = fileURLToPath(new URL("./fixtures/no-network.mjs", import.meta.url));
const quiet = () => {};
const FIXTURE_VERDICTS = { theme: "warn", modality: [{ modality: "responsive-web", status: "warn" }] };
const FIXTURE_ASSESSMENT = { run: "R-20261022-0930", compare: [{ rule: "list.empty", finding: "F-0001", status: "resolved" }, { rule: null, finding: "F-0002", status: "new" }, { rule: "flow.back", finding: "F-0003", status: "not-rechecked" }] };

/* The CONTRACT-007 fixture: created, guidance, failing then passing checks, a decision, a transcript, change, outcome. */
function fixtureEpisode(app, { goal = "Review screen" } = {}) {
  const id = openEpisode(app, { trigger: "create", goal: { text: goal, stories: ["US-003"], screens: ["review"], journeys: ["J-review"] }, agent: { name: "claude-code", model: "claude-opus-5-5" } });
  appendEvent(app, "created", { modalities: ["responsive-web"], theme: "databricks", options: { helix: true }, files: 42, blueprint: "sha256:abc" }, { by: "@ux-builder/create-app@0.7.0" });
  appendEvent(app, "guidance", { tool: "get_rules", input: { context: "view", sizeClass: "compact" }, answer: { ruleIds: ["flow.back", "list.empty"], components: ["List"], recipes: ["list-detail"], guidanceHash: "sha256:def", bytes: 2048 } }, { by: "@ux-builder/mcp@0.6.0" });
  for (const [status, findings] of [["fail", [{ ruleId: "ux-builder/no-hex", severity: "error", count: 2 }]], ["pass", []]]) appendEvent(app, "check", { check: "lint", attempt: attemptOf(app, "lint"), status, findings }, { by: "@ux-builder/ui@0.9.0" });
  appendEvent(app, "check", { check: "audit", attempt: attemptOf(app, "audit"), status: "warn", findings: [{ ruleId: "theme.radius", severity: "minor", count: 1 }], report: "audit-report/report.json", verdicts: FIXTURE_VERDICTS, assessment: FIXTURE_ASSESSMENT }, { by: "@ux-builder/audit@0.4.0" });
  appendEvent(app, "decision", { chose: "list-detail", considered: ["table", "cards"], why: "The review queue is scanned then opened one at a time", relied: ["list.empty", "US-003"], departs: false, workaround: true, screen: "review" }, { by: "agent" });
  const t = join(app, "..", `${app.split("/").pop()}-session.jsonl`);
  writeFileSync(t, `{"type":"user","text":"key ${SECRETS.apiKey}"}\n{"type":"assistant","text":"ok"}\n`);
  attachTranscript(app, { file: t, agent: "claude-code" });
  commit(app, `${id}.txt`, `Review screen\n\nUX-Episode: ${id}`);
  closeEpisode(app);
  return id;
}

describe("schemas", () => {
  test("the three schemas are valid JSON Schema 2020-12", () => {
    const ajv = new Ajv2020({ strict: false });
    for (const f of readdirSync(join(PKG, "schema"))) ajv.compile(JSON.parse(readFileSync(join(PKG, "schema", f), "utf8")));
  });

  test("a fixture episode holds every kind, and every event validates against event.schema.json", () => {
    const app = tempApp();
    const id = fixtureEpisode(app);
    const ev = readEpisode(app, id);
    assert.deepEqual([...new Set(ev.map((e) => e.kind))].sort(), [...KINDS].sort());
    for (const e of ev) assert.deepEqual(validateEvent(e), [], `${e.seq} ${e.kind}`);
    assert.deepEqual(validateTrace(app), []);
    const outcome = ev.find((e) => e.kind === "outcome");
    assert.deepEqual(outcome.checksToGreen, { lint: 2, audit: 1 }, "a warn run counts as green");
    assert.deepEqual(outcome.audit, { verdicts: FIXTURE_VERDICTS, findings: { "theme.radius": 1 } });
    assert.deepEqual(outcome.assessment, FIXTURE_ASSESSMENT);
    assert.match(ev[0].commit, /^[0-9a-f]{40}$/);
    assert.equal("parent" in ev.find((e) => e.kind === "change"), false, "parent only when start.commit is null");
  });

  test("the schema refuses what CONTRACT-007 does not allow", () => {
    const base = { v: 1, episode: "E-20261022-x", seq: 1, at: "2026-10-22T10:00:00.000Z", by: "t" };
    assert.notDeepEqual(validateEvent({ ...base, kind: "check", check: "lint", attempt: 1, status: "ok", findings: [] }), []);
    assert.notDeepEqual(validateEvent({ ...base, kind: "decision", chose: "a", why: "b", source: "const x = 1" }), []);
    assert.notDeepEqual(validateEvent({ ...base, kind: "end", status: "done", v: 2 }), []);
    assert.notDeepEqual(validateEvent({ ...base, kind: "end" }), []);
    assert.deepEqual(validateEvent({ ...base, kind: "end", status: "abandoned" }), []);
    const outcome = (o) => validateEvent({ ...base, kind: "outcome", audit: { verdicts: null, findings: {} }, assessment: null, checksToGreen: {}, ...o });
    assert.deepEqual(outcome({}), []);
    assert.notDeepEqual(outcome({ audit: null }), []);
    assert.notDeepEqual(outcome({ audit: { verdicts: { theme: "pass" }, findings: {} } }), [], "verdicts need modality");
    assert.notDeepEqual(outcome({ assessment: { run: "R-1", compare: [{ rule: null, finding: "F-1", status: "fixed" }] } }), []);
    assert.notDeepEqual(outcome({ checksToGreen: { lint: 0 } }), []);
  });

  test("validate names a malformed line, a seq gap, an unknown kind and a schema failure, and exits 1", () => {
    const app = tempApp();
    const id = fixtureEpisode(app);
    const file = join(app, ".ux-builder/trace", `${id}.jsonl`);
    const good = readFileSync(file, "utf8").split("\n").filter(Boolean);
    const e = (o) => JSON.stringify({ ...JSON.parse(good[1]), ...o });
    writeFileSync(file, [good[0], "{not json", e({ seq: 5 }), e({ seq: 6, kind: "telemetry" }), e({ seq: 7, files: "many" })].join("\n") + "\n");
    const messages = validateTrace(app).map((p) => `${p.line}: ${p.message}`);
    assert.ok(messages.includes("2: malformed line: not JSON"), messages.join("\n"));
    assert.ok(messages.includes("3: seq gap: expected 3, found 5"), messages.join("\n"));
    assert.ok(messages.includes('4: unknown kind "telemetry"'), messages.join("\n"));
    assert.ok(messages.some((m) => m.startsWith("5: /files must be integer")), messages.join("\n"));
    const r = cli(app, ["validate"]);
    assert.equal(r.status, 1);
    assert.match(r.stderr, new RegExp(`\\.ux-builder/trace/${id}\\.jsonl:2: malformed line`));
    writeFileSync(file, good.join("\n") + "\n");
    assert.equal(cli(app, ["validate"]).status, 0);
  });
});

describe("export", () => {
  // @covers US-109-AC1
  test("--episode lists every file with its masked count and asks to confirm; without a yes nothing is written", async () => {
    const app = tempApp();
    const id = fixtureEpisode(app);
    const out = join(app, "..", `${id}-${process.pid}.tgz`);
    const r = cli(app, ["export", "--episode", id, "--out", out]);
    assert.equal(r.status, 1);
    assert.match(r.stderr, new RegExp(`will hold 1 episode \\(${id}\\)`));
    assert.match(r.stderr, /bundle\.json {2}\d+ bytes {2}masked 0/);
    assert.match(r.stderr, new RegExp(`trace/${id}\\.jsonl {2}\\d+ bytes {2}masked \\d+`));
    assert.match(r.stderr, new RegExp(`transcripts/${id}/1\\.jsonl {2}\\d+ bytes {2}masked 1`));
    assert.match(r.stderr, /nothing written: needs confirmation .*pass --yes/);
    assert.equal(existsSync(out), false);
    let shown;
    const declined = await exportBundle(app, { episodes: [id], out, log: quiet, confirm: (preview) => { shown = preview; return false; } });
    assert.equal(declined.written, false);
    assert.deepEqual(shown.map((f) => f.path), ["bundle.json", `trace/${id}.jsonl`, `transcripts/${id}/1.jsonl`]);
    assert.equal(existsSync(out), false);
    const yes = cli(app, ["export", "--episode", id, "--out", out, "--yes"]);
    assert.equal(yes.status, 0, yes.stderr);
    assert.match(yes.stdout, /Nothing was sent/);
    assert.ok(existsSync(out));
  });

  // @covers US-109-AC1
  test("--since picks episodes started on or after the date; an open episode needs --include-open", async () => {
    const app = tempApp();
    const done = fixtureEpisode(app);
    const open = openEpisode(app, { goal: { text: "Still going" } });
    const out = join(app, "..", `since-${process.pid}.tgz`);
    const logged = [];
    const r = await exportBundle(app, { since: "2026-01-01", out, yes: true, log: (s) => logged.push(s) });
    assert.deepEqual(r.bundle.episodes, [done]);
    assert.ok(logged.includes(`skipping ${open}: still open (--include-open includes it)`));
    const all = await exportBundle(app, { since: "2026-01-01", out, yes: true, includeOpen: true, log: quiet });
    assert.deepEqual(all.bundle.episodes, [done, open].sort());
    await assert.rejects(exportBundle(app, { since: "2999-01-01", out, yes: true, log: quiet }), /No episodes to export/);
    await assert.rejects(exportBundle(app, { episodes: [open], out, yes: true, log: quiet }), /still open; end it first, or pass --include-open/);
  });

  // @covers US-109-AC2
  test("the bundle holds bundle.json (repository name hashed, no remote URL), each episode's events and its transcripts, and validates", async () => {
    const app = tempApp({ pkg: { name: "client-portal", private: true } });
    git(app, "remote", "add", "origin", "https://github.com/acme-health/secret-client-portal.git");
    const a = fixtureEpisode(app, { goal: "Review screen" });
    const b = fixtureEpisode(app, { goal: "Settings page" });
    const out = join(app, "..", `bundle-${process.pid}.tgz`);
    const r = await exportBundle(app, { episodes: [a, b], out, yes: true, log: quiet });
    assert.equal(r.written, true);
    const { bundle, files } = readBundle(out);
    assert.deepEqual(validateBundle(bundle), []);
    assert.deepEqual(bundle.episodes, [a, b]);
    assert.equal(bundle.app.name, "client-portal");
    assert.equal(bundle.app.repoHash, `sha256:${createHash("sha256").update("acme-health/secret-client-portal").digest("hex")}`);
    const raw = JSON.stringify(bundle);
    for (const s of ["github.com", "secret-client-portal", "acme-health", "https://"]) assert.ok(!raw.includes(s), `bundle.json holds ${s}`);
    assert.deepEqual([...files.keys()].sort(), [`trace/${a}.jsonl`, `trace/${b}.jsonl`, `transcripts/${a}/1.jsonl`, `transcripts/${b}/1.jsonl`].sort());
    for (const [path, text] of files) assert.equal(text, readFileSync(join(app, ".ux-builder", path), "utf8"), `${path} round-trips`);
    assert.equal(bundle.masked, [...files.values()].reduce((n, t) => n + (t.match(/\[masked:[a-z-]+\]/g) ?? []).length, 0));
    assert.ok(bundle.masked >= 2, "the fixture transcripts' API keys");
    // The round-tripped events still validate.
    for (const [path, text] of files) if (path.startsWith("trace/")) for (const l of text.split("\n").filter(Boolean)) assert.deepEqual(validateEvent(JSON.parse(l)), [], path);
  });

  test("no event or bundle in the fixtures holds source code or an unmasked secret", async () => {
    const app = tempApp();
    const id = fixtureEpisode(app);
    const out = join(app, "..", `clean-${process.pid}.tgz`);
    await exportBundle(app, { episodes: [id], out, yes: true, log: quiet });
    const { bundle, files } = readBundle(out);
    const texts = [JSON.stringify(bundle), ...files.values()];
    const code = /\bimport\s+[\w{*].*\bfrom\b|\bfunction\s*\w*\s*\(|=>\s*[{(]|<\/?[A-Z][A-Za-z]*[\s/>]|\bconst\s+\w+\s*=/;
    for (const l of files.get(`trace/${id}.jsonl`).split("\n").filter(Boolean)) assert.doesNotMatch(l, code);
    assert.doesNotMatch(JSON.stringify(bundle), code);
    for (const t of texts) for (const s of Object.values(SECRETS)) assert.ok(!t.includes(s));
  });

  // @covers US-109-AC3
  test("an unmasked secret pattern anywhere: exit 1 naming the file and line, and nothing written", async () => {
    const app = tempApp();
    const id = fixtureEpisode(app);
    const out = join(app, "..", `leak-${process.pid}.tgz`);
    // A transcript edited by hand after it was attached, with a token that was never masked.
    appendFileSync(join(app, ".ux-builder/transcripts", id, "1.jsonl"), `{"type":"tool","text":"${SECRETS.github}"}\n`);
    const r = cli(app, ["export", "--episode", id, "--out", out, "--yes"]);
    assert.equal(r.status, 1);
    assert.match(r.stderr, new RegExp(`\\.ux-builder/transcripts/${id}/1\\.jsonl:3 \\(github-token\\)`));
    assert.match(r.stderr, /nothing was written/);
    assert.equal(existsSync(out), false);
    // A line a tool wrote without masking, and a value added to .env since the episode was recorded.
    const trace = join(app, ".ux-builder/trace", `${id}.jsonl`);
    const last = readFileSync(trace, "utf8").split("\n").filter(Boolean).length;
    writeFileSync(join(app, ".env"), "SECRET_PLAN=list-detail\n");
    await assert.rejects(exportBundle(app, { episodes: [id], out, yes: true, log: quiet }), (e) => {
      assert.equal(e.code, "SECRET");
      assert.ok(e.problems.some((p) => p.file === `.ux-builder/transcripts/${id}/1.jsonl` && p.line === 3));
      assert.ok(e.problems.some((p) => p.file === `.ux-builder/trace/${id}.jsonl` && p.kind === "env" && p.line < last));
      return true;
    });
    assert.equal(existsSync(out), false);
  });

  // @covers US-109-AC4
  test("export makes no network request: it runs with every network API blocked", () => {
    const app = tempApp();
    git(app, "remote", "add", "origin", "git@github.com:acme/app.git");
    const id = fixtureEpisode(app);
    // The block works: a fetch under it fails and is recorded.
    const probe = cli(app, ["status"], { nodeArgs: ["--import", NO_NETWORK, "--eval", "fetch('https://example.com').catch(()=>{})"] });
    assert.match(probe.stderr, /NETWORK-BLOCKED fetch/);
    const out = join(app, "..", `offline-${process.pid}.tgz`);
    const r = cli(app, ["export", "--episode", id, "--out", out, "--yes"], { nodeArgs: ["--import", NO_NETWORK] });
    assert.equal(r.status, 0, r.stderr);
    assert.doesNotMatch(r.stderr, /NETWORK-/);
    assert.ok(existsSync(out));
    assert.equal(readBundle(out).bundle.episodes[0], id);
    // And the package imports nothing that could open a connection.
    for (const f of readdirSync(PKG).filter((n) => n.endsWith(".mjs"))) {
      const src = readFileSync(join(PKG, f), "utf8");
      assert.doesNotMatch(src, /from\s+["']node:(net|http|https|http2|tls|dns|dgram)["']|\bfetch\s*\(|WebSocket/, f);
    }
  });

  test("the episode ID carries the date", () => {
    const app = tempApp();
    assert.ok(openEpisode(app, { goal: { text: "x" } }).startsWith(`E-${today()}-`));
  });
});
