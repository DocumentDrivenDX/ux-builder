/* The ux-builder-design skill's text (US-117-AC4, AC5): what it tells the
   agent, read as the installed skill is read.

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import * as design from "../index.mjs";

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
    // The steps inside each activity are the eight steps the person sees, by their names (GDL-79).
    const names = design.STEPS.map((x) => x.name);
    for (const [a, steps] of Object.entries({ Define: [1, 2, 3], Explore: [4, 5], Experience: [6], Validate: [7, 8] })) for (const n of steps) assert.match(rows[a].stages, new RegExp(`${n} ${names[n - 1]}`), `${a}: ${n} ${names[n - 1]}`);
    assert.match(s, /The person sees eight steps \("Step n of 8"\)/);
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
    assert.match(acts, /eight steps \("Step n of 8"\)/);
    assert.match(section("Where the person is"), /"Step 2 of 8: Understand users\."/);
    const open = section("Opening every session");
    assert.match(open, /ux-builder-design status/);
    assert.match(open, /tell the person where things stand/i);
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

describe("Define in the skill (US-122)", () => {
  // @covers US-122-AC5
  test("runs Define through HELIX's grill, carries an undecided interaction model to Explore as an open question, and regenerates the brief when its sources change", () => {
    const s = section("Define");
    assert.match(s, /structured interview through HELIX's `grill`/);
    assert.match(s, /record it as an open question[\s\S]*carry it to Explore/);
    assert.match(s, /Regenerate the brief whenever its sources change: the PRD,\s+principles\.md, the stories or the design state/);
  });
});

describe("starting in an existing app (US-115)", () => {
  // @covers US-115-AC6
  test("the first session runs baseline, then routes a change, 'too complicated', complaints and a new feature", () => {
    const s = section("Starting in an existing app");
    assert.match(s, /run `ux-builder-design baseline`/);
    assert.match(s, /\*\*a specific change\*\*.*→ impact, then Explore/);
    assert.match(s, /\*\*"it feels too complicated"\*\* → the assessment, then `simplify`/);
    assert.match(s, /\*\*user complaints\*\* → evidence/);
    assert.match(s, /\*\*a new feature\*\* → Define/);
  });
});

describe("the skill needs no MCP (US-116)", () => {
  // @covers US-116-AC3
  test("every command it names is a ux-builder-design or ux-builder-blueprint command CONTRACT-008 lists, and no step needs an MCP tool", () => {
    const contract = readFileSync(new URL("../../../docs/helix/02-design/contracts/CONTRACT-008-guided-design.md", import.meta.url), "utf8");
    const listed = new Set([...contract.matchAll(/^\| `([a-z-]+)(?: (?:[^`|]|\\\|)*)?`/gm)].map((m) => m[1]));
    const named = [...SKILL.matchAll(/ux-builder-design ([a-z-]+)/g)].map((m) => m[1]);
    assert.ok(named.length >= 8, named.join(" "));
    for (const c of new Set(named)) assert.ok(listed.has(c), `the skill names ux-builder-design ${c}, which CONTRACT-008 does not list`);
    for (const c of new Set([...SKILL.matchAll(/ux-builder-blueprint ([a-z-]+)/g)].map((m) => m[1]))) assert.ok(["check", "propose", "init", "draw", "wireframes", "score", "compare", "simplify", "alternative", "prototype"].includes(c), c);
    // An MCP tool is only ever offered beside a command or file that does the same.
    const MCP = /\b(get_rules|get_design_state|update_design_state|design_status|record_decision|start_episode|end_episode|check_blueprint|list_recipes)\b/;
    for (const line of SKILL.split("\n").filter((l) => MCP.test(l))) assert.match(line, / or /, `an MCP tool with no alternative: ${line}`);
    assert.match(SKILL, /never need it/);
  });
});

describe("business rules in the skill (US-147)", () => {
  // @covers US-147-AC6
  test("AC6: modelling tasks, the agent cites each business rule by ID and asks the person the four questions", () => {
    const text = section("Model tasks");
    assert.match(text, /\*\*Business rules\.\*\*/);
    assert.match(text, /defined once in\nHELIX, as `\*\*BR-<n>\*\* — <rule>`/);
    assert.match(text, /`"rules": \["BR-1"\]` on the task, and on the journey step where\nit bites/);
    for (const k of ["trigger", "before", "blocked", "recover"]) assert.match(text, new RegExp(`"${k}": "…"`), k);
    assert.match(text, /ask the person four questions/);
  });
});

describe("the guided conversation in the skill (US-148)", () => {
  // @covers US-148-AC7
  test("AC7: each foundation kind shown inline as a table, feedback collected and addressed, approval before the next kind; the step said at each step", () => {
    const review = section("Review and approval");
    assert.match(review, /Show the whole table inline, every row in full/);
    assert.match(review, /review feedback <item> --text/);
    assert.match(review, /review respond <FB-n>/);
    assert.match(review, /`review approve --kind <kind>\s+--answer "…"`\. Then the next kind\./);
    assert.match(review, /Never\nsend the person to a file instead/);
    assert.match(section("Where the person is"), /"Step 2 of 8: Understand users\."/);
    assert.match(section("Explaining terms"), /say what it means and why it is valuable/);
  });
});
