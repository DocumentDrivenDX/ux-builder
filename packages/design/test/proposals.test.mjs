/* US-156: HELIX proposals the person approves, not copies by hand. The
   preview lists each pending proposal in one line (what it creates or
   changes, an ID it would renumber, any problem) and writes nothing; apply
   writes only the accepted ones, all or nothing, renumbering a new
   document whose ID HELIX already uses and rewriting references to it.

     node --test packages/design/test/proposals.test.mjs */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { after, describe, test } from "node:test";
import { propose, writeProposals } from "@ux-builder/ui/blueprint/propose";
import { unifiedDiff } from "../../ui/blueprint/diff.mjs";
import { makeApp } from "../../ui/test/helix-app.mjs";
import { DesignError, proposalsDir } from "../index.mjs";
import { proposalsApply, proposalsPreview } from "../proposals.mjs";
import { tempApp } from "./helpers.mjs";

const made = [];
after(() => { for (const d of made) rmSync(d, { recursive: true, force: true }); });

const put = (app, rel, text) => { mkdirSync(dirname(join(app, rel)), { recursive: true }); writeFileSync(join(app, rel), text); };
const read = (app, rel) => readFileSync(join(app, rel), "utf8");
/* Every file under the app with its text: what a step wrote, or did not. */
const tree = (dir) => {
  const out = {};
  const walk = (d) => { for (const n of readdirSync(d).sort()) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else out[p.slice(dir.length + 1)] = readFileSync(p, "utf8"); } };
  walk(dir);
  return out;
};

const doc = (id, type, title, body, links = []) => `---\nddx:\n  id: ${id}\n  type: ${type}\n  status: draft${links.length ? `\n  links:\n${links.map(([k, to]) => `    - kind: ${k}\n      to: ${to}`).join("\n")}` : ""}\n---\n\n# ${title}\n\n${body}\n`;
const FEAT = "docs/helix/01-frame/features";
const US = "docs/helix/01-frame/user-stories";
const STORY = doc("US-001", "user-stories", "US-001: Sign in", "## Context\n\nPeople sign in.\n\n## Walkthrough\n\n1. User [action]\n\n## Acceptance Criteria\n\n- [ ] **US-001-AC1** — Given a person, when they sign in, then they see home.", [["informed_by", "FEAT-001"]]);
const WALKED = STORY.replace("1. User [action]", "1. On **Sign in**, the user chooses **Continue**; **Home** opens.");

/* A HELIX app with FEAT-001 (sign in) and US-001, and proposals as propose writes them:
   a new FEAT-001 (export; its ID taken), a new story linking to it, US-001's walkthrough,
   a solution design's screen flow and a wireframe draft. */
function app() {
  const a = tempApp();
  put(a, ".helix.yml", "version: 1\nflows:\n  - id: helix\n    root: docs/helix/\ndefaults:\n  flow: helix\n");
  put(a, `${FEAT}/FEAT-001-sign-in.md`, doc("FEAT-001", "feature-specification", "Feature Specification: FEAT-001 — Sign in", "People sign in."));
  put(a, `${US}/US-001-sign-in.md`, STORY);
  put(a, "docs/helix/02-design/solution-designs/SD-001-sign-in.md", doc("SD-001", "solution-design", "Solution Design: SD-001 — Sign in", "## System Decomposition\n\nOne screen.", [["informed_by", "FEAT-001"]]));
  const dir = proposalsDir(a);
  const exportFeat = doc("FEAT-001", "feature-specification", "Feature Specification: FEAT-001 — Export", "People export their entries.\n\nSee [[US-002-export-entries]].", [["informed_by", "prd"]]);
  const story2 = doc("US-002", "user-stories", "US-002: Export entries", "**Feature**: [[FEAT-001-export]]\n\n## Acceptance Criteria\n\n- [ ] **US-002-AC1** — Given entries, when exported, then a file downloads.", [["informed_by", "FEAT-001"]]);
  const sd = read(a, "docs/helix/02-design/solution-designs/SD-001-sign-in.md");
  const patches = {
    "FEAT-001-export": [`${FEAT}/FEAT-001-export.md`, null, exportFeat, { kind: "new", id: "FEAT-001", type: "feature-specification" }, "Feature"],
    "US-002-story": [`${US}/US-002-export-entries.md`, null, story2, { kind: "new", id: "US-002", type: "user-stories" }, "Story"],
    "US-001-walkthrough": [`${US}/US-001-sign-in.md`, STORY, WALKED, { kind: "existing", id: "US-001", type: "user-stories" }, "Walkthrough"],
    "SD-001-screen-flow": ["docs/helix/02-design/solution-designs/SD-001-sign-in.md", sd, sd.replace("One screen.\n", "One screen.\n\n## Screen Flow\n\n```mermaid\nflowchart LR\n    signin --> home\n```\n"), { kind: "existing", id: "SD-001", type: "solution-design" }, "Screen Flow"],
  };
  const proposals = [];
  for (const [id, [path, before, afterText, target, section]] of Object.entries(patches)) {
    put(a, `${dir}/${id}.patch`, unifiedDiff(path, before, afterText));
    proposals.push({ id, kind: "test", path, section, target, file: `${id}.patch` });
  }
  const wf = "docs/helix/02-design/wireframes/WF-001-home.md";
  put(a, `${dir}/drafts/${wf}`, doc("WF-001", "wireframe", "WF-001: Home", "## Layout\n\nA list.", [["informed_by", "US-001"]]));
  put(a, `${dir}/proposals.json`, JSON.stringify({ flow: "helix", proposals, drafts: [{ id: "WF-001-wireframe", kind: "wireframe", type: "wireframe", path: wf, sections: ["Layout"], file: `drafts/${wf}` }], disagreements: [], current: [], problems: [] }, null, 2) + "\n");
  return a;
}

describe("US-156: HELIX proposals the person approves", () => {
  // @covers US-156-AC1
  test("AC1: the preview lists each pending proposal in one line, flags an ID HELIX already uses, and writes nothing", () => {
    const a = app();
    const before = tree(a);
    const r = proposalsPreview(a);
    assert.deepEqual(tree(a), before, "nothing is written");
    assert.deepEqual(r.proposals.map((p) => [p.id, p.kind]), [["FEAT-001-export", "new"], ["US-002-story", "new"], ["US-001-walkthrough", "patch"], ["SD-001-screen-flow", "patch"], ["WF-001-wireframe", "new"]]);
    const lines = r.text.split("\n").filter((l) => l.startsWith("- "));
    assert.equal(lines.length, 5, "one line per proposal");
    const feat = r.proposals[0];
    assert.deepEqual(feat.collisions, [{ id: "FEAT-001", with: `${FEAT}/FEAT-001-sign-in.md`, becomes: "FEAT-002" }]);
    assert.equal(feat.target, `${FEAT}/FEAT-002-export.md`);
    assert.match(lines[0], /^- FEAT-001-export: creates docs\/helix\/01-frame\/features\/FEAT-002-export\.md .*ID FEAT-001 is already docs\/helix\/01-frame\/features\/FEAT-001-sign-in\.md's, so it becomes FEAT-002/);
    assert.match(lines[2], /^- US-001-walkthrough: changes docs\/helix\/01-frame\/user-stories\/US-001-sign-in\.md \(Walkthrough\)$/);
    for (const p of r.proposals.slice(1)) assert.deepEqual([p.collisions, p.problems], [[], []], p.id);
    assert.match(r.text, /Nothing was written/);

    // A problem shows on its own line: US-001 changed since the walkthrough was proposed.
    put(a, `${US}/US-001-sign-in.md`, STORY.replace("1. User [action]", "1. Written by hand."));
    const stale = proposalsPreview(a).proposals.find((p) => p.id === "US-001-walkthrough");
    assert.match(stale.problems.join(), /no longer matches/);
    assert.match(stale.summary, /problem: does not apply/);
  });

  // @covers US-156-AC2
  test("AC2: apply writes only the accepted proposals, renumbers a colliding ID and rewrites references to it, and leaves the rest pending", () => {
    const a = app();
    const dir = proposalsDir(a);
    const signIn = read(a, `${FEAT}/FEAT-001-sign-in.md`);
    const r = proposalsApply(a, { accepted: ["FEAT-001-export", "US-002-story", "US-001-walkthrough"] });
    assert.deepEqual(r.applied, [
      { id: "FEAT-001-export", target: `${FEAT}/FEAT-002-export.md`, renumbered: { from: "FEAT-001", to: "FEAT-002" } },
      { id: "US-002-story", target: `${US}/US-002-export-entries.md` },
      { id: "US-001-walkthrough", target: `${US}/US-001-sign-in.md` },
    ]);
    assert.match(r.text, /Applied 3 proposals to HELIX/);
    assert.match(r.text, /2 proposals still pending/);
    // The existing FEAT-001 is untouched; the new feature is FEAT-002 in its file name and frontmatter.
    assert.equal(read(a, `${FEAT}/FEAT-001-sign-in.md`), signIn);
    assert.ok(!existsSync(join(a, `${FEAT}/FEAT-001-export.md`)));
    const feat = read(a, `${FEAT}/FEAT-002-export.md`);
    assert.match(feat, /^ddx:\n {2}id: FEAT-002$/m);
    assert.match(feat, /^# Feature Specification: FEAT-002 — Export$/m);
    // The accepted story's link and wiki reference follow the renumbered feature.
    const story = read(a, `${US}/US-002-export-entries.md`);
    assert.match(story, /^ {6}to: FEAT-002$/m);
    assert.match(story, /\[\[FEAT-002-export\]\]/);
    assert.doesNotMatch(story, /FEAT-001/);
    assert.equal(read(a, `${US}/US-001-sign-in.md`), WALKED);
    // Not accepted: not written, still pending.
    assert.doesNotMatch(read(a, "docs/helix/02-design/solution-designs/SD-001-sign-in.md"), /Screen Flow/);
    assert.ok(!existsSync(join(a, "docs/helix/02-design/wireframes/WF-001-home.md")));
    assert.deepEqual(proposalsPreview(a).proposals.map((p) => p.id), ["SD-001-screen-flow", "WF-001-wireframe"]);
    // Applied proposals leave the pending set for applied/.
    assert.ok(existsSync(join(a, dir, "applied/FEAT-001-export.patch")));
    assert.ok(!existsSync(join(a, dir, "FEAT-001-export.patch")));
    const manifest = JSON.parse(read(a, `${dir}/proposals.json`));
    assert.deepEqual(manifest.applied.map((x) => x.id), ["FEAT-001-export", "US-002-story", "US-001-walkthrough"]);

    // A dry run says what would happen and writes nothing.
    const before = tree(a);
    const dry = proposalsApply(a, { accepted: ["WF-001-wireframe"], dryRun: true });
    assert.equal(dry.dryRun, true);
    assert.match(dry.text, /Would apply 1 proposal/);
    assert.deepEqual(tree(a), before);
  });

  // @covers US-156-AC2
  test("AC2: a patch that no longer applies, or malformed frontmatter, writes nothing at all", () => {
    const a = app();
    put(a, `${US}/US-001-sign-in.md`, STORY.replace("1. User [action]", "1. Written by hand."));
    const before = tree(a);
    assert.throws(() => proposalsApply(a, { accepted: ["FEAT-001-export", "US-002-story", "US-001-walkthrough"] }), (e) => e instanceof DesignError && /nothing was written/.test(e.message) && /US-001-walkthrough: does not apply to docs\/helix\/01-frame\/user-stories\/US-001-sign-in\.md/.test(e.message) && e.details.problems.length === 1);
    assert.deepEqual(tree(a), before, "not even the proposals that would apply");

    const b = app();
    const dir = proposalsDir(b);
    const wf = `${dir}/drafts/docs/helix/02-design/wireframes/WF-001-home.md`;
    put(b, wf, read(b, wf).replace("  type: wireframe", "  type: [wireframe"));
    const was = tree(b);
    assert.throws(() => proposalsApply(b, { accepted: ["SD-001-screen-flow", "WF-001-wireframe"] }), (e) => e instanceof DesignError && /WF-001-wireframe: .*WF-001-home\.md: its frontmatter does not parse/.test(e.message));
    assert.deepEqual(tree(b), was);

    // A new document without a ddx.id, and an unknown proposal, are refused too.
    put(b, wf, "---\ntitle: Home\n---\n\n# Home\n");
    assert.throws(() => proposalsApply(b, { accepted: ["WF-001-wireframe"] }), /its frontmatter has no ddx\.id/);
    assert.throws(() => proposalsApply(b, { accepted: ["nope"] }), /no pending proposal nope/);
    assert.deepEqual(Object.keys(tree(b)), Object.keys(was));
  });

  test("real proposals from ux-builder-blueprint propose apply as git apply would", () => {
    const make = () => { const h = makeApp(); h.init(); made.push(h.dir); return h; };
    const mine = make(), theirs = make();
    for (const h of [mine, theirs]) writeProposals(propose(JSON.parse(readFileSync(h.blueprint, "utf8")), { blueprintFile: h.blueprint }), join(h.dir, proposalsDir(h.dir)));
    const pre = proposalsPreview(mine.dir);
    const patches = pre.proposals.filter((p) => existsSync(join(mine.dir, proposalsDir(mine.dir), `${p.id}.patch`)));
    assert.ok(patches.length >= 4, pre.text);
    for (const p of pre.proposals) assert.deepEqual(p.problems, [], `${p.id}: ${p.problems}`);
    proposalsApply(mine.dir, { accepted: patches.map((p) => p.id) });
    for (const p of patches) {
      const g = spawnSync("git", ["apply", join(proposalsDir(theirs.dir), `${p.id}.patch`)], { cwd: theirs.dir, encoding: "utf8" });
      assert.equal(g.status, 0, g.stderr);
    }
    const helix = (d) => tree(join(d, "docs/helix"));
    assert.deepEqual(helix(mine.dir), helix(theirs.dir));
  });
});
