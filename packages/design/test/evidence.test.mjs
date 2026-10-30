/* Research evidence in a study's HELIX research plan (US-125; FEAT-018
   GDL-18, GDL-19; ADR-039, ADR-042).

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { currentText, studyPath } from "../index.mjs";
import { cli, helixApp } from "./helpers.mjs";

const SKILL = readFileSync(new URL("../skill/ux-builder-design/SKILL.md", import.meta.url), "utf8");
const TRANSCRIPT = "Interviewer: Where do you fish?\nSam Rivera: Mostly the Clackamas, near home.\n";
const PLAN = "docs/helix/01-frame/research/anglers.md";

function withTranscript() {
  const app = helixApp();
  mkdirSync(join(app, "research"), { recursive: true });
  writeFileSync(join(app, "research/interview-1.txt"), TRANSCRIPT);
  return app;
}
const plan = (app) => currentText(app, PLAN).text;
/* A study whose plan has these excerpt lines (applied, on disk). */
function study(app, excerpts) {
  mkdirSync(join(app, "docs/helix/01-frame/research"), { recursive: true });
  writeFileSync(join(app, PLAN), `---\nddx:\n  id: research-anglers\n  type: research-plan\n---\n\n# Research plan: anglers\n\n## Research Methods\n\n### Sources\n\n| Source | Kind | Date | Where it is kept |\n|---|---|---|---|\n| interview 1 | interview | 2026-10-20 | Research drive |\n\n## Findings\n\n### Excerpts\n\n${excerpts.map((e) => `- ${e}`).join("\n")}\n`);
}

describe("US-125: evidence in a study", () => {
  // @covers US-125-AC1
  test("AC1: evidence add proposes a source row for the study's research plan, with kind, date and where it is kept, and copies none of its text", () => {
    const app = withTranscript();
    let r = cli(app, ["evidence", "add", "research/interview-1.txt", "--kind", "interview", "--study", "anglers", "--date", "2026-10-20", "--source", "Research drive, interviews", "--title", "interview 1", "--json"]);
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.deepEqual({ study: out.study, path: out.path, source: out.source, kind: out.kind, date: out.date, file: out.file }, { study: "anglers", path: PLAN, source: "interview 1", kind: "interview", date: "2026-10-20", file: "research/interview-1.txt" });
    assert.equal(existsSync(join(app, PLAN)), false, "HELIX is written only by applying the proposal");
    const text = plan(app);
    assert.match(text, /^---\nddx:\n  id: research-anglers\n  type: research-plan\n/);
    for (const h of ["Research Objectives", "Research Methods", "Timeline", "Research Risks", "Completion Criteria"]) assert.match(text, new RegExp(`^## ${h}$`, "m"), h);
    assert.match(text, /^1\. \*\*Question\*\*: /m, "HELIX's validator needs a research question");
    assert.match(text, /### Sources\n\n\| Source \| Kind \| Date \| Where it is kept \|\n\|---\|---\|---\|---\|\n\| interview 1 \| interview \| 2026-10-20 \| Research drive, interviews; not copied here \|/);
    assert.doesNotMatch(text, /Clackamas|Sam Rivera|Where do you fish/);
    r = cli(app, ["evidence", "add", "research/interview-1.txt", "--kind", "support", "--study", "anglers", "--json"]);
    assert.equal(r.status, 0, r.stderr);
    assert.equal((plan(app).match(/^\| .* \| (interview|support) \|/gm) ?? []).length, 2);
    assert.equal(cli(app, ["evidence", "add", "research/interview-1.txt", "--kind", "support"]).status, 2, "a source belongs to a study");
    assert.equal(cli(app, ["validate"]).status, 0, cli(app, ["validate"]).stdout);
  });

  // @covers US-125-AC2
  test("AC2: another kind exits 2, names the allowed kinds and writes nothing", () => {
    const app = withTranscript();
    const r = cli(app, ["evidence", "add", "research/interview-1.txt", "--kind", "gossip", "--study", "anglers"]);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /--kind is one of interview, analytics, support, feedback, survey, observation, not "gossip"/);
    assert.equal(existsSync(join(app, "docs/ux-builder/helix-proposals")), false);
  });

  // @covers US-125-AC3
  test("AC3: an email address, a phone number and a key in a study's excerpts fail, each named; masked, they pass", () => {
    const app = helixApp();
    const key = ["sk", "live", "Zx9Yw8Vu7Ts6Rq5Po4Nm3Lk2"].join("-");
    study(app, ['P1 (interview 1): "Write to me at sam@example.com"', 'P1 (interview 1): "Call 503-555-0142 if the gate is shut"', `P1 (interview 1): "my key is ${key}"`]);
    let r = cli(app, ["validate"]);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /anglers\.md: an excerpt holds an email address; mask it \(ADR-039\)/);
    assert.match(r.stdout, /anglers\.md: an excerpt holds a phone number; mask it \(ADR-039\)/);
    assert.match(r.stdout, /anglers\.md: an excerpt holds an unmasked api-key; mask it \(ADR-039\)/);
    study(app, ['P1 (interview 1): "Write to me at [masked:email]"', 'P1 (interview 1): "Call [masked:phone] if the gate is shut"', 'P1 (interview 1): "my key is [masked:api-key]"']);
    r = cli(app, ["validate"]);
    assert.equal(r.status, 0, r.stdout);
  });

  // @covers US-125-AC4
  test("AC4: an excerpt naming a participant by the real name the owner keeps out of git, or by a name for its speaker, fails until it uses the pseudonym", () => {
    const app = helixApp();
    writeFileSync(join(app, ".ux-builder/participants.local.json"), JSON.stringify({ P1: "Sam Rivera" }));
    study(app, ['P1 (interview 1): "Sam Rivera here, I fish the Clackamas"']);
    let r = cli(app, ["validate"]);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /names a participant; use the pseudonym P1 \(ADR-039\)/);
    // A first name alone is caught too.
    study(app, ['P1 (interview 1): "Sam here, I fish the Clackamas"']);
    assert.equal(cli(app, ["validate"]).status, 1);
    study(app, ['P1 (interview 1): "P1 here, I fish the Clackamas"']);
    r = cli(app, ["validate"]);
    assert.equal(r.status, 0, r.stdout);
    // And an excerpt by a name, not a pseudonym, fails.
    study(app, ['Dana (interview 1): "I kayak"']);
    assert.match(cli(app, ["validate"]).stdout, /an excerpt is by "Dana", not a pseudonym/);
  });

  // @covers US-125-AC5
  test("AC5: evidence list --json lists each study with its sources and the excerpts cited; evidence excerpt add proposes a masked quote by pseudonym", () => {
    const app = withTranscript();
    for (const [kind, date] of [["interview", "2026-10-20"], ["support", "2026-10-21"]]) assert.equal(cli(app, ["evidence", "add", "research/interview-1.txt", "--kind", kind, "--study", "anglers", "--date", date, "--source", `${kind} export`, "--title", `${kind} ${date}`]).status, 0);
    assert.equal(cli(app, ["evidence", "add", "research/interview-1.txt", "--kind", "analytics", "--study", "night-planning", "--date", "2026-10-22"]).status, 0);
    let r = cli(app, ["evidence", "excerpt", "add", "--study", "anglers", "--participant", "Dana Wu", "--text", "Dana here: email me at dana@example.com", "--at", "00:03:10", "--source", "interview 2026-10-20"]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /- P1 \(interview 2026-10-20, 00:03:10\): "P1 here: email me at \[masked:email\]"$/m);
    cli(app, ["evidence", "excerpt", "add", "--study", "anglers", "--participant", "P1", "--text", "The ramp floods in spring"]);
    const text = plan(app);
    assert.ok(!/Dana|dana@/.test(text), text);
    assert.match(text, /## Findings\n\n### Excerpts\n\n- P1 \(interview 2026-10-20, 00:03:10\): "P1 here: email me at \[masked:email\]"\n- P1: "The ramp floods in spring"/);
    const { studies } = JSON.parse(cli(app, ["evidence", "list", "--json"]).stdout);
    assert.deepEqual(studies.map(({ study, sources, excerpts }) => ({ study, sources: sources.map((s) => `${s.kind} ${s.date}`), excerpts })), [
      { study: "anglers", sources: ["interview 2026-10-20", "support 2026-10-21"], excerpts: 2 },
      { study: "night-planning", sources: ["analytics 2026-10-22"], excerpts: 0 },
    ]);
    assert.equal(cli(app, ["validate"]).status, 0, cli(app, ["validate"]).stdout);
    assert.equal(cli(app, ["evidence", "excerpt", "add", "--study", "nope", "--participant", "P1", "--text", "x"]).status, 2);
    assert.equal(studyPath(app, "Night planning"), "docs/helix/01-frame/research/night-planning.md");
  });

  // @covers US-125-AC6
  test("AC6: the skill's research section reports frustrations, task sequences, unmet needs, segment differences and say-do conflicts, each citing its study", () => {
    const s = SKILL.slice(SKILL.indexOf("## Understand users"), SKILL.indexOf("## Checkpoints"));
    for (const x of ["repeated frustrations", "common task sequences", "unmet needs", "differences between segments", "conflicts between what users say and what they do"]) assert.ok(s.includes(x), x);
    assert.match(s, /each point citing its study/);
  });
});
