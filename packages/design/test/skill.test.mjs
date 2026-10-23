/* The ux-builder-design skill's text (US-117-AC4, AC5): what it tells the
   agent, read as the installed skill is read.

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";

const SKILL = readFileSync(new URL("../skill/ux-builder-design/SKILL.md", import.meta.url), "utf8");

/* The body of the section headed `heading`, up to the next ## heading. */
function section(heading) {
  const start = SKILL.indexOf(`\n## ${heading}\n`);
  assert.ok(start >= 0, `the skill has a "${heading}" section`);
  const end = SKILL.indexOf("\n## ", start + 4);
  return SKILL.slice(start, end < 0 ? undefined : end);
}

describe("the skill", () => {
  test("has a name and a description that says when to use it", () => {
    assert.match(SKILL, /^---\nname: ux-builder-design\ndescription: .*Use when asked to design, redesign or simplify/s);
  });

  // @covers US-117-AC4
  test("describes the four activities, the stages inside each and what the person does in each", () => {
    const s = section("The four activities");
    const rows = Object.fromEntries([...s.matchAll(/^\| (Define|Explore|Experience|Validate) \| ([^|]+) \| ([^|]+) \|$/gm)].map(([, a, stages, human]) => [a, { stages, human }]));
    assert.deepEqual(Object.keys(rows), ["Define", "Explore", "Experience", "Validate"]);
    assert.match(rows.Define.stages, /Define intent.*Understand users.*Define tasks/);
    assert.match(rows.Explore.stages, /Optimize flows.*Design structure/);
    assert.match(rows.Experience.stages, /Prototype/);
    assert.match(rows.Validate.stages, /Validate.*Refine/);
    for (const { human } of Object.values(rows)) assert.ok(human.trim().length > 20);
    assert.match(s, /works with the evolving experience, not with the documents/);
    assert.match(s, /You keep the\s+documents up to date/);
  });

  // @covers US-117-AC5
  test("names the guide's knowledge sources and its tools", () => {
    const s = section("What you draw on");
    const [knowledge, tools] = s.split("**Tools:**");
    for (const k of [/rules/, /rubric/, /research evidence/, /task model/, /[Dd]ecision history/]) assert.match(knowledge, k);
    for (const t of [/assessment/, /[Pp]rototypes/, /audit/, /[Jj]ourney events/]) assert.match(tools, t);
  });

  test("works without MCP: it drives the CLI and treats MCP as optional", () => {
    assert.match(SKILL, /Run them through your shell/);
    assert.match(SKILL, /you never need it/);
  });
});

describe("the skill for a new app (US-114)", () => {
  // @covers US-114-AC5
  test("names the eight capabilities and the four activities, and opens each session with the design state's summary", () => {
    const caps = section("Eight capabilities");
    for (const c of ["Requirements analysis", "UX research", "Task modelling", "Interaction optimization", "UX design", "Prototyping", "UX evaluation", "Artifact management"]) assert.match(caps, new RegExp(`\\| ${c} \\|`));
    const acts = section("The four activities");
    for (const a of ["Define", "Explore", "Experience", "Validate"]) assert.match(acts, new RegExp(`^\\| ${a} \\|`, "m"));
    const open = section("Opening every session");
    assert.match(open, /ux-builder-design status/);
    assert.match(open, /Tell the person where things stand/);
  });
});

describe("checkpoints, HELIX, challenge and change mode in the skill", () => {
  // @covers US-118-AC4
  test("lists the three core and three conditional checkpoints; one question and wait; only questions that change the design; reversible assumptions with state set", () => {
    const s = section("Checkpoints");
    for (const id of ["core-1", "core-2", "core-3", "significant-change", "experiment", "release"]) assert.match(s, new RegExp("`" + id + "`"));
    assert.match(s, /Three core checkpoints/);
    assert.match(s, /Three conditional checkpoints/);
    assert.match(s, /ask the person one\s+question, and wait/);
    assert.match(s, /only questions whose answers materially change the design/);
    assert.match(s, /small,\s+reversible assumptions yourself and list each one with\s+`state set 'assumptions\[\+\]'/);
  });

  // @covers US-118-AC5
  test("HELIX documents change only through propose patches offered as a batch at a checkpoint; the guide never edits docs/helix/", () => {
    const s = section("HELIX documents");
    assert.match(s, /only through proposals: run\s+`ux-builder-blueprint propose`/);
    assert.match(s, /as a\s+batch at a checkpoint/);
    assert.match(s, /Never edit\s+`docs\/helix\/` yourself/);
  });

  // @covers US-119-AC4
  test("the skill and a new app's AGENTS.md state the objective, the six challenge questions and the five answers every addition needs", () => {
    const agents = readFileSync(new URL("../../create-app/template/AGENTS.md", import.meta.url), "utf8");
    const challenge = section("Challenge before you add");
    const objective = section("Standing objective");
    const questions = [/What user goal does it support\?/, /Is it necessary\?/, /Could an existing interaction reach the same goal\?/, /Could the system do the task for the user\?/, /Would it increase cognitive load\?/, /Is there a simpler interaction model\?/];
    for (const text of [objective + challenge, agents]) {
      const flat = text.replace(/\s+/g, " ");
      assert.match(flat, /minimum viable interaction that lets the intended user accomplish the intended outcome/);
      for (const q of questions) assert.match(flat, new RegExp(q.source, "i"));
    }
    for (const f of ["--goal", "--without", "--simplest", "--assumptions", "--validation"]) assert.match(challenge, new RegExp(f));
    assert.match(agents, /goal, without,\s+simplest, assumptions and validation/);
  });

  // @covers US-121-AC4
  test("says when to use the full loop and when change mode, lists change mode's four steps, and says to name the mode and that the person can switch", () => {
    const s = section("Full loop or change mode");
    assert.match(s, /\*\*full loop\*\* for a new product or a substantial feature/);
    assert.match(s, /\*\*change mode\*\*.*for an\s+everyday change/s);
    const steps = s.match(/^\d\. .+$/gm);
    assert.equal(steps.length, 4);
    assert.match(steps.join("\n"), /challenge[\s\S]*impact[\s\S]*complexity[\s\S]*decision/);
    assert.match(s, /Tell the person which mode you are\s+in and why, and that they can switch/);
  });
});
