/* Research evidence (US-125; FEAT-018 GDL-18, GDL-19; ADR-039).

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { cli, tempApp } from "./helpers.mjs";

const SKILL = readFileSync(new URL("../skill/ux-builder-design/SKILL.md", import.meta.url), "utf8");
const TRANSCRIPT = "Interviewer: Where do you fish?\nSam Rivera: Mostly the Clackamas, near home.\n";

function withTranscript() {
  const app = tempApp();
  mkdirSync(join(app, "research"), { recursive: true });
  writeFileSync(join(app, "research/interview-1.txt"), TRANSCRIPT);
  return app;
}
/* An evidence record with these excerpt lines. */
function record(app, excerpts, participants = "  participants:\n    P1: \"Angler\"\n") {
  mkdirSync(join(app, "docs/ux/evidence"), { recursive: true });
  writeFileSync(join(app, "docs/ux/evidence/EV-1.md"), `---\nux:\n  id: EV-1\n  type: research-evidence\n  kind: interview\n${participants}---\n\n# EV-1\n\n## Source\n\n- interview\n\n## Excerpts\n\n${excerpts.map((e) => `- ${e}`).join("\n")}\n\n## Synthesis notes\n\n- None.\n`);
}

describe("US-125: evidence", () => {
  // @covers US-125-AC1
  test("AC1: evidence add writes EV-<n> with the next free number, kind, date, source and a reference to the file, and copies none of its text", () => {
    const app = withTranscript();
    let r = cli(app, ["evidence", "add", "research/interview-1.txt", "--kind", "interview", "--date", "2026-10-20", "--source", "Research drive, interviews", "--json"]);
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(JSON.parse(r.stdout), { id: "EV-1", path: "docs/ux/evidence/EV-1.md", kind: "interview", date: "2026-10-20", source: "Research drive, interviews", file: "research/interview-1.txt" });
    const text = readFileSync(join(app, "docs/ux/evidence/EV-1.md"), "utf8");
    assert.match(text, /kind: interview\n {2}date: 2026-10-20\n {2}source: "Research drive, interviews"\n {2}file: "research\/interview-1\.txt"/);
    assert.doesNotMatch(text, /Clackamas|Sam Rivera|Where do you fish/);
    r = cli(app, ["evidence", "add", "research/interview-1.txt", "--kind", "support", "--json"]);
    assert.equal(JSON.parse(r.stdout).id, "EV-2");
    assert.equal(cli(app, ["validate"]).status, 0);
  });

  // @covers US-125-AC2
  test("AC2: another kind exits 2, names the allowed kinds and writes nothing", () => {
    const app = withTranscript();
    const r = cli(app, ["evidence", "add", "research/interview-1.txt", "--kind", "gossip"]);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /--kind is one of interview, analytics, support, survey, observation, not "gossip"/);
    assert.equal(existsSync(join(app, "docs/ux/evidence")), false);
  });

  // @covers US-125-AC3
  test("AC3: an email address, a phone number and a key in excerpts fail, each named; masked, they pass", () => {
    const app = tempApp();
    const key = ["sk", "live", "Zx9Yw8Vu7Ts6Rq5Po4Nm3Lk2"].join("-");
    record(app, ['P1: "Write to me at sam@example.com"', 'P1: "Call 503-555-0142 if the gate is shut"', `P1: "my key is ${key}"`]);
    let r = cli(app, ["validate"]);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /EV-1\.md: the excerpt on line \d+ holds an email address; mask it \(ADR-039\)/);
    assert.match(r.stdout, /EV-1\.md: the excerpt on line \d+ holds a phone number; mask it \(ADR-039\)/);
    assert.match(r.stdout, /EV-1\.md: line \d+ of the body holds an unmasked api-key; mask it \(ADR-039\)/);
    record(app, ['P1: "Write to me at [masked:email]"', 'P1: "Call [masked:phone] if the gate is shut"', 'P1: "my key is [masked:api-key]"']);
    r = cli(app, ["validate"]);
    assert.equal(r.status, 0, r.stdout);
  });

  // @covers US-125-AC4
  test("AC4: an excerpt naming a participant by the real name the owner keeps out of git fails until it uses the pseudonym", () => {
    const app = tempApp();
    writeFileSync(join(app, ".ux-builder/participants.local.json"), JSON.stringify({ P1: "Sam Rivera" }));
    record(app, ['P1: "Sam Rivera here, I fish the Clackamas"']);
    let r = cli(app, ["validate"]);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /names a participant; use the pseudonym P1 \(ADR-039\)/);
    record(app, ['P1: "P1 here, I fish the Clackamas"']);
    r = cli(app, ["validate"]);
    assert.equal(r.status, 0, r.stdout);
    // And an excerpt by a pseudonym not listed fails.
    record(app, ['P2: "I kayak"']);
    assert.match(cli(app, ["validate"]).stdout, /excerpt by P2, who is not listed under participants/);
  });

  // @covers US-125-AC5
  test("AC5: evidence list --json lists each with its ID, kind, date, source and the excerpts cited", () => {
    const app = withTranscript();
    for (const [kind, date] of [["interview", "2026-10-20"], ["support", "2026-10-21"], ["analytics", "2026-10-22"]]) assert.equal(cli(app, ["evidence", "add", "research/interview-1.txt", "--kind", kind, "--date", date, "--source", `${kind} export`]).status, 0);
    const p = join(app, "docs/ux/evidence/EV-1.md");
    writeFileSync(p, readFileSync(p, "utf8").replace("participants: {}", "participants:\n    P1: \"Angler\"").replace(/- None cited yet\.[^\n]*/, '- P1: "I check the map the night before"\n- P1: "Access is the hard part"'));
    const { evidence } = JSON.parse(cli(app, ["evidence", "list", "--json"]).stdout);
    assert.deepEqual(evidence.map(({ id, kind, date, source, excerpts }) => ({ id, kind, date, source, excerpts })), [
      { id: "EV-1", kind: "interview", date: "2026-10-20", source: "interview export", excerpts: 2 },
      { id: "EV-2", kind: "support", date: "2026-10-21", source: "support export", excerpts: 0 },
      { id: "EV-3", kind: "analytics", date: "2026-10-22", source: "analytics export", excerpts: 0 },
    ]);
  });

  // @covers US-125-AC6
  test("AC6: the skill's research section reports frustrations, task sequences, unmet needs, segment differences and say-do conflicts, each citing evidence IDs", () => {
    const s = SKILL.slice(SKILL.indexOf("## Understand users"), SKILL.indexOf("## Checkpoints"));
    for (const x of ["repeated frustrations", "common task sequences", "unmet needs", "differences between segments", "conflicts between what users say and what they do"]) assert.ok(s.includes(x), x);
    assert.match(s, /each point citing the evidence IDs \(EV-<n>\)/);
  });
});
