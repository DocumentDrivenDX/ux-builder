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
