/* The assessment manifest: init and validate (FEAT-009 CTX-01 to CTX-04,
   ENV-01 to ENV-03; US-056-AC1, AC2, AC3, AC5; STP-056).

     npm test --workspace @ux-builder/audit */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { after, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { parse, stringify } from "yaml";
import { load, validate } from "../assess/manifest.mjs";
import { makeRepo } from "./fixtures/helix-repo.mjs";

const CLI = fileURLToPath(new URL("../cli.mjs", import.meta.url));
const run = (args, cwd) => spawnSync(process.execPath, [CLI, "assess", ...args], { cwd, encoding: "utf8" });
const repos = [];
const repo = (o) => { const r = makeRepo(o); repos.push(r); return r; };
after(() => { for (const r of repos) r.remove(); });

const good = () => ({
  version: 1,
  app: { name: "Review app" },
  helix: { flow: "helix" },
  run: { start: "npm run dev", baseUrl: "http://127.0.0.1:4173/", environment: "local" },
  roles: [{ id: "reviewer", auth: { env: "REVIEWER_STATE" } }],
  journeys: [{ id: "J-review", story: "US-001", criteria: ["US-001-AC2"], priority: "critical", role: "reviewer", entry: "/queue" }],
  tests: [{ id: "unit", command: "npm test" }],
  restrictions: { writes: "report-only" },
});
const check = (r, data) => { writeFileSync(join(r.dir, "ux-assessment.yml"), stringify(data)); return validate(load(join(r.dir, "ux-assessment.yml"))); };

describe("US-056: bootstrap and validate the assessment manifest", () => {
  // @covers US-056-AC1
  test("AC1: init proposes a manifest from the repository, with placeholders and no requirement text", () => {
    const r = repo();
    const out = run(["init"], r.dir);
    assert.equal(out.status, 0, out.stderr);
    const text = readFileSync(join(r.dir, "ux-assessment.yml"), "utf8");
    const m = parse(text);
    assert.deepEqual(m.helix, { flow: "helix", catalog: "auto" });
    assert.match(text, /marker \.helix\.yml, flow "helix" \(root docs\/helix\), catalogue repository/);
    assert.deepEqual(m.tests, [{ id: "test", command: "npm test" }, { id: "test-e2e", command: "npm run test:e2e" }]);
    assert.deepEqual(m.journeys.map((j) => j.story), ["US-001", "US-002"], "typed stories, by ID");
    assert.equal(m.run.start, "npm run dev");
    for (const s of ["they are listed", "leaves the queue", "Review a queue", "the entry returns"]) assert.ok(!text.includes(s), `no requirement text: ${s}`);
    assert.match(m.run.baseUrl, /^<fill-in: /);
    assert.match(m.journeys[0].priority, /^<fill-in: /);
    // A placeholder is a problem until it is filled in; and init never overwrites.
    const v = run(["validate"], r.dir);
    assert.equal(v.status, 1);
    assert.match(v.stdout, /\/run\/baseUrl\s+not filled in/);
    const again = run(["init"], r.dir);
    assert.equal(again.status, 1);
    assert.match(again.stderr, /exists/);
  });

  // @covers US-056-AC2
  test("AC2: validate checks schema, paths, flow, commands, stories and criteria, each problem with its path", () => {
    const r = repo();
    assert.deepEqual(check(r, good()).problems, []);
    const bad = good();
    bad.journeys[0].story = "US-009";
    bad.journeys.push({ id: "J-undo", story: "US-002", criteria: ["US-002-AC7"], priority: "important", role: "reviewer", entry: "/queue" });
    bad.tests.push({ id: "e2e", command: "npm run test:visual" });
    bad.run.cwd = "./missing";
    bad.colour = "blue";
    const { problems } = check(r, bad);
    const at = Object.fromEntries(problems.map((p) => [p.path, p.message]));
    assert.match(at["/colour"], /not a manifest field/);
    assert.match(at["/journeys/0/story"], /no story US-009 in the flow "helix"/);
    assert.match(at["/journeys/1/criteria/0"], /US-002-AC7 is not a criterion of US-002/);
    assert.match(at["/run/cwd"], /does not exist/);
    bad.run.cwd = ".";
    const p2 = Object.fromEntries(check(r, bad).problems.map((p) => [p.path, p.message]));
    assert.match(p2["/tests/1/command"], /npm script "test:visual" is not in/);
    writeFileSync(join(r.dir, "ux-assessment.yml"), stringify(bad));
    const cli = run(["validate"], r.dir);
    assert.equal(cli.status, 1);
    assert.match(cli.stdout, /\/journeys\/0\/story/);
    assert.equal(run(["validate", "--manifest", "nope.yml"], r.dir).status, 2);
  });

  // @covers US-056-AC3
  test("AC3: credentials only by reference; a secret fails, named by field and never echoed", () => {
    const r = repo();
    const ref = good();
    ref.roles.push({ id: "admin", auth: { storageState: "package.json" } }, { id: "guest", auth: "none" });
    assert.deepEqual(check(r, ref).problems, []);
    const TOKEN = "sk-test" + "A1b2C3d4E5f6G7h8I9j0";
    const bad = good();
    bad.app.repository = `https://x.test/?key=${TOKEN}`;
    bad.roles[0].auth = { password: "hunter2-hunter2" };
    writeFileSync(join(r.dir, "ux-assessment.yml"), stringify(bad));
    const out = run(["validate"], r.dir);
    assert.equal(out.status, 1);
    assert.match(out.stdout, /\/app\/repository\s+holds what looks like an API key/);
    assert.match(out.stdout, /\/roles\/0\/auth/);
    assert.ok(!out.stdout.includes(TOKEN) && !out.stderr.includes(TOKEN), "the value is not printed");
    assert.ok(!out.stdout.includes("hunter2"), "nor the password");
  });

  // @covers US-056-AC5
  test("AC5: production, off-origin entries, consequential actions and other write scopes are refused; deny defaults always apply", () => {
    const r = repo();
    const { resolved } = check(r, good());
    assert.deepEqual(resolved.restrictions.deny.slice(0, 4), ["payment", "send-message", "production-approval", "delete-real-data"]);
    const bad = good();
    bad.run.environment = "production";
    bad.journeys[0].entry = "https://shop.example.com/checkout";
    bad.restrictions = { writes: "apply", allow: ["payment"] };
    const at = Object.fromEntries(check(r, bad).problems.map((p) => [p.path, p.message]));
    assert.match(at["/run/environment"], /production is refused/);
    assert.match(at["/journeys/0/entry"], /outside run.origins/);
    assert.match(at["/restrictions/allow/0"], /consequential action/);
    assert.match(at["/restrictions/writes"], /report-only/);
  });

  // @covers US-151-AC8
  test("AC8: a journey is named by what it is, without the J- prefix; an older J- name still passes, and a name that is not kebab-case does not", () => {
    const r = repo();
    for (const id of ["review", "J-review"]) {
      const m = good(); m.journeys[0].id = id;
      assert.deepEqual(check(r, m).problems.filter((p) => p.path.startsWith("/journeys/0/id")), [], id);
    }
    const bad = good(); bad.journeys[0].id = "Review Queue";
    assert.ok(check(r, bad).problems.some((p) => p.path === "/journeys/0/id"));
  });
});
