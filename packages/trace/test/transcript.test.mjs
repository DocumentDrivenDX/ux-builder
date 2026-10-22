/* Transcripts and masking (US-108, CONTRACT-007 Masking).

     npm test --workspace @ux-builder/trace */

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { appendEvent, attachTranscript, mask, openEpisode, readEpisode, validateTrace } from "../index.mjs";
import { cli, SECRETS, tempApp, today } from "./helpers.mjs";

const sha = (b) => createHash("sha256").update(b).digest("hex");

function transcriptFile(app, name, text) {
  const dir = join(app, "..", `${app.split("/").pop()}-agent`);
  mkdirSync(dir, { recursive: true });
  const f = join(dir, name);
  writeFileSync(f, text);
  return f;
}

describe("attach-transcript", () => {
  // @covers US-108-AC2
  test("the hook's JSON on stdin: the transcript is copied under transcripts/<episode>/ and a transcript event records it", () => {
    const app = tempApp();
    const id = openEpisode(app, { goal: { text: "Hook" }, agent: { name: "claude-code", model: "m" } });
    const body = ['{"type":"user","message":"build the review screen"}', '{"type":"assistant","message":"done"}', ""].join("\n");
    const src = transcriptFile(app, "session-1.jsonl", body);
    mkdirSync(join(app, "src"));
    const hook = JSON.stringify({ session_id: "abc-123", transcript_path: src, cwd: join(app, "src"), hook_event_name: "SessionEnd", reason: "exit" });
    const r = cli(join(app, "src"), ["attach-transcript"], { input: hook });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, new RegExp(`Attached transcripts/${id}/1.jsonl to ${id}`));
    const copied = readFileSync(join(app, ".ux-builder/transcripts", id, "1.jsonl"));
    assert.equal(copied.toString(), body);
    const e = readEpisode(app, id).at(-1);
    assert.equal(e.kind, "transcript");
    assert.deepEqual({ file: e.file, agent: e.agent, bytes: e.bytes, sha256: e.sha256, masked: e.masked, session: e.session }, { file: `transcripts/${id}/1.jsonl`, agent: "claude-code", bytes: copied.length, sha256: sha(copied), masked: 0, session: "abc-123" });
    assert.deepEqual(validateTrace(app), []);
  });

  // @covers US-108-AC3
  test("--file other-agent.log is attached the same way", () => {
    const app = tempApp();
    const id = openEpisode(app, { goal: { text: "Other agent" }, agent: { name: "codex", model: "x" } });
    const src = transcriptFile(app, "other-agent.log", "turn 1: plan\nturn 2: build\n");
    const r = cli(app, ["attach-transcript", "--file", src]);
    assert.equal(r.status, 0, r.stderr);
    const again = attachTranscript(app, { file: src, agent: "aider" });
    assert.equal(again.file, `transcripts/${id}/2.log`);
    const [first, second] = readEpisode(app, id).filter((e) => e.kind === "transcript");
    assert.equal(first.file, `transcripts/${id}/1.log`);
    assert.equal(first.agent, "codex", "the episode's agent when --agent is not given");
    assert.equal(second.agent, "aider");
    assert.equal(readFileSync(join(app, ".ux-builder", first.file), "utf8"), "turn 1: plan\nturn 2: build\n");
    assert.equal(first.sha256, sha(readFileSync(join(app, ".ux-builder", first.file))));
  });

  test("with no open episode the transcript goes to the unscoped episode", () => {
    const app = tempApp();
    const r = attachTranscript(app, { file: transcriptFile(app, "t.txt", "hello\n") });
    assert.equal(r.episode, `E-${today()}-unscoped-main`);
    assert.deepEqual(validateTrace(app), []);
  });

  // @covers US-108-AC4
  test("an API key, a GitHub token, a JWT, an .env value and a redact.text match are each masked: masked is 5", () => {
    const app = tempApp();
    writeFileSync(join(app, ".env"), `PORT=3000\nDATABASE_PASSWORD="${SECRETS.env}"\nDEBUG=true\n`);
    mkdirSync(join(app, ".ux-builder"), { recursive: true });
    writeFileSync(join(app, ".ux-builder/config.json"), JSON.stringify({ redact: { text: ["ACME-\\d{4}"] } }));
    const id = openEpisode(app, { goal: { text: "Masking" } });
    const body = [
      `user: my key is ${SECRETS.apiKey}`,
      `tool: git push with ${SECRETS.github}`,
      `assistant: the session cookie holds ${SECRETS.jwt}`,
      `tool: cat .env -> DATABASE_PASSWORD=${SECRETS.env}`,
      `user: this is for client ${SECRETS.client}, port 3000, debug true`,
      "",
    ].join("\n");
    const r = attachTranscript(app, { file: transcriptFile(app, "masked.jsonl", body) });
    assert.equal(r.masked, 5);
    assert.deepEqual(r.kinds, { "api-key": 1, "github-token": 1, jwt: 1, env: 1, redact: 1 });
    const copied = readFileSync(join(app, ".ux-builder", r.file), "utf8");
    for (const s of Object.values(SECRETS)) assert.ok(!copied.includes(s), `${s} is masked`);
    for (const k of ["api-key", "github-token", "jwt", "env", "redact"]) assert.ok(copied.includes(`[masked:${k}]`), k);
    assert.match(copied, /port 3000, debug true/, "short .env values are not masked everywhere");
    assert.equal(readEpisode(app, id).at(-1).masked, 5);
  });

  test("the manifest's evidence.redact.text, npm, AWS and private-key shapes are masked too; events are masked before they are written", () => {
    const app = tempApp();
    writeFileSync(join(app, "ux-assessment.yml"), "evidence:\n  redact:\n    text:\n      - 'Patient #\\d+'\n");
    const npm = ["npm", "a".repeat(36)].join("_");
    const aws = ["AKIA", "ABCDEFGHIJKLMNOP"].join("");
    const pem = ["-----BEGIN RSA PRIVATE KEY-----", "MIIB", "-----END RSA PRIVATE KEY-----"].join("\n");
    const r = mask(`Patient #4411 ${npm} ${aws}\n${pem}\nBearer abc123def456ghi789jkl`, { appDir: app });
    assert.deepEqual(r.kinds, { "private-key": 1, "npm-token": 1, "aws-key": 1, authorization: 1, redact: 1 });
    assert.equal(r.count, 5);
    assert.equal(mask("Basic information about the Bearer of news").count, 0);
    openEpisode(app, { goal: { text: `Goal mentioning ${SECRETS.apiKey}` } });
    const e = appendEvent(app, "decision", { chose: "x", why: `because ${SECRETS.jwt}`, considered: [SECRETS.github] });
    assert.equal(e.why, "because [masked:jwt]");
    assert.deepEqual(e.considered, ["[masked:github-token]"]);
    const raw = readFileSync(join(app, ".ux-builder/trace", `${e.episode}.jsonl`), "utf8");
    for (const s of Object.values(SECRETS)) assert.ok(!raw.includes(s));
  });

  // @covers US-108-AC5
  test('"transcripts": false in config.json: nothing is copied, and it says why', () => {
    const app = tempApp();
    mkdirSync(join(app, ".ux-builder"), { recursive: true });
    writeFileSync(join(app, ".ux-builder/config.json"), JSON.stringify({ transcripts: false }));
    const id = openEpisode(app, { goal: { text: "Off" } });
    const r = cli(app, ["attach-transcript", "--file", transcriptFile(app, "t.jsonl", "secret plans\n")]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /No transcript attached: transcripts are off: \.ux-builder\/config\.json sets "transcripts": false/);
    assert.equal(existsSync(join(app, ".ux-builder/transcripts")), false);
    assert.equal(readEpisode(app, id).some((e) => e.kind === "transcript"), false);
  });

  // @covers US-108-AC5
  test("an episode started with --no-transcripts: nothing is copied, and it says why", () => {
    const app = tempApp();
    const id = cli(app, ["start", "--goal", "Private", "--no-transcripts"]).stdout.split("\n")[0];
    assert.equal(readEpisode(app, id)[0].transcripts, false);
    const r = cli(app, ["attach-transcript"], { input: JSON.stringify({ transcript_path: transcriptFile(app, "t.jsonl", "x\n"), session_id: "s", cwd: app }) });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, new RegExp(`No transcript attached: episode ${id} was started with --no-transcripts`));
    assert.equal(existsSync(join(app, ".ux-builder/transcripts")), false);
  });

  test("no transcript named is a usage error", () => {
    const app = tempApp();
    assert.throws(() => attachTranscript(app, {}), /No transcript to attach/);
    assert.equal(cli(app, ["attach-transcript"], { input: "" }).status, 2);
  });
});
