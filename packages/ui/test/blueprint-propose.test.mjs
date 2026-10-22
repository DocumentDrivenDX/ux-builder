/* HELIX content drafted from the blueprint, as proposals (FEAT-012 DRF-01,
   DRF-02; US-089; ADR-030; CONTRACT-004 Flows and journeys): the review
   blueprint in a HELIX-governed app (test/helix-app.mjs) with HELIX
   v0.18.0's templates installed.

     npm test --workspace @ux-builder/ui */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { after, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { propose, unwritten } from "../blueprint/propose.mjs";
import { unifiedDiff } from "../blueprint/diff.mjs";
import { makeApp } from "./helix-app.mjs";

const CLI = fileURLToPath(new URL("../blueprint/cli.mjs", import.meta.url));
const apps = [];
after(() => { for (const a of apps) rmSync(a.dir, { recursive: true, force: true }); });

const app = () => { const a = makeApp(); a.init(); apps.push(a); return a; };
const run = (a, ...args) => spawnSync(process.execPath, [CLI, "propose", ...args], { cwd: a.dir, encoding: "utf8" });
const tree = (dir) => {
  const out = {};
  const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isDirectory()) walk(p); else out[p.slice(dir.length + 1)] = [statSync(p).mtimeMs, readFileSync(p, "utf8")]; } };
  walk(dir);
  return out;
};
const docs = (a) => Object.fromEntries(Object.entries(tree(a.dir)).filter(([p]) => p.startsWith("docs/") || p === ".helix.yml"));
const patch = (a, name) => readFileSync(join(a.dir, "helix-proposals", name), "utf8");
const added = (p) => p.split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++")).map((l) => l.slice(1));
/* Apply a patch as a person would, from the repository root (git apply works outside a repository too). */
const apply = (a, name) => spawnSync("git", ["apply", join("helix-proposals", name)], { cwd: a.dir, encoding: "utf8" });

describe("US-089: ux-builder-blueprint propose", () => {
  // @covers US-089-AC1
  test("AC1: a patch for the story's Walkthrough, one numbered step per journey step, and nothing applied", () => {
    const a = app();
    const before = docs(a);
    const r = run(a);
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(docs(a), before, "no HELIX document is written");
    const p = patch(a, "US-012-walkthrough.patch");
    assert.match(p, /^--- a\/docs\/helix\/01-frame\/user-stories\/US-012-review-entries\.md$/m);
    const steps = added(p).filter((l) => /^\d+\. /.test(l));
    const journey = JSON.parse(readFileSync(a.blueprint, "utf8")).journeys[0];
    assert.equal(steps.length, journey.steps.length);
    assert.deepEqual(steps, [
      "1. On **Review queue**, the user chooses **Open entry**; **Entry** opens.",
      "2. On **Entry**, the user chooses **Approve**; **Review queue** opens.",
      "3. On **Review queue**, the user sees its empty state.",
    ]);
    // The template's placeholder walkthrough is what the patch replaces.
    assert.ok(p.split("\n").some((l) => l === "-1. User [action]"));
    assert.match(r.stdout, /nothing applied/);
    // Applied by a person, it is a valid patch.
    assert.equal(apply(a, "US-012-walkthrough.patch").status, 0);
    assert.match(readFileSync(join(a.dir, "docs/helix/01-frame/user-stories/US-012-review-entries.md"), "utf8"), /## Walkthrough\n\n<!-- From blueprint journey J-review[^\n]*-->\n1\. On \*\*Review queue\*\*/);
  });

  // @covers US-089-AC2
  test("AC2: a Mermaid flowchart for the governing solution design, and the primary journey's sequence diagram for architecture's Data Flow", () => {
    const a = app();
    assert.equal(run(a).status, 0);
    const sd = patch(a, "SD-012-screen-flow.patch");
    assert.match(sd, /^\+\+\+ b\/docs\/helix\/02-design\/solution-designs\/SD-012-time-review\.md$/m, "the solution design that names FEAT-012, the stories' feature");
    const sdLines = added(sd);
    assert.ok(sdLines.includes("## Screen Flow"));
    assert.ok(sdLines.includes("flowchart LR"));
    for (const edge of ['queue -->|"Open entry"| entry', 'entry -->|"Approve"| queue', 'entry -->|"Reject"| entry__reject_reason', 'entry__reject_reason -.->|"Reject"| entry', 'nav -->|"Review"| queue', 'queue -.->|"Help"| external']) assert.ok(sdLines.includes(`    ${edge}`), edge);
    // After System Decomposition, before Risks, as the template orders it.
    assert.equal(apply(a, "SD-012-screen-flow.patch").status, 0);
    const text = readFileSync(join(a.dir, "docs/helix/02-design/solution-designs/SD-012-time-review.md"), "utf8");
    assert.ok(text.indexOf("## System Decomposition") < text.indexOf("## Screen Flow") && text.indexOf("## Screen Flow") < text.indexOf("## Risks"));

    const arch = patch(a, "architecture-data-flow.patch");
    assert.match(arch, /^new file mode 100644\n--- \/dev\/null\n\+\+\+ b\/docs\/helix\/02-design\/architecture\.md$/m, "no architecture yet: drafted from the template");
    const archLines = added(arch);
    assert.ok(archLines.includes("## Level 1: System Context"), "the template's other sections stay as it wrote them");
    const flow = archLines.slice(archLines.indexOf("## Data Flow"));
    assert.deepEqual(flow.slice(0, 12), ["## Data Flow", "", "```mermaid", "sequenceDiagram", "    %% Blueprint journey J-review (US-012), from ux-builder-blueprint propose.", "    actor User",
      "    participant queue as Review queue", "    participant entry as Entry", "    User->>queue: Open entry", "    queue->>entry: opens", "    User->>entry: Approve", "    entry->>queue: opens"]);
    assert.equal(archLines.filter((l) => l === "sequenceDiagram").length, 1, "the template's placeholder diagram is replaced, not kept beside it");
    assert.equal(apply(a, "architecture-data-flow.patch").status, 0);
  });

  // @covers US-089-AC3
  test("AC3: a patch for DESIGN.md's navigation table, each destination at each supported size class", () => {
    const a = app();
    assert.equal(run(a).status, 0);
    const p = patch(a, "design-system-navigation.patch");
    assert.match(p, /^--- a\/docs\/helix\/02-design\/DESIGN\.md$/m);
    const lines = added(p);
    assert.deepEqual(lines.filter((l) => l.startsWith("|")), [
      "| Destination | Screen | compact | expanded |", "|---|---|---|---|",
      "| Review | Review queue (`queue`) | Bottom bar | Side navigation |",
      "| Entries | Entries (`list`) | Bottom bar | Side navigation |",
      "| Settings | Settings (`settings`) | Bottom bar | Side navigation |",
    ]);
    assert.ok(lines.includes("### Destinations by Size Class"), "a subsection of Navigation and Active State");
    assert.ok(!p.split("\n").some((l) => l.startsWith("-")  && !l.startsWith("---")), "the person's navigation text is kept");
    assert.equal(apply(a, "design-system-navigation.patch").status, 0);
    const text = readFileSync(join(a.dir, "docs/helix/02-design/DESIGN.md"), "utf8");
    assert.ok(text.indexOf("## Navigation and Active State") < text.indexOf("### Destinations by Size Class") && text.indexOf("### Destinations by Size Class") < text.indexOf("## Visual Hierarchy"));
  });

  // @covers US-089-AC4
  test("AC4: story test plan scenarios, one per step and per alternate, citing the criteria", () => {
    const a = app();
    assert.equal(run(a).status, 0);
    const p = patch(a, "STP-012-journey-scenarios.patch");
    assert.match(p, /^\+\+\+ b\/docs\/helix\/03-test\/test-plans\/STP-012-review-entries\.md$/m, "the template's location and naming, from the story");
    const lines = added(p);
    assert.ok(lines.includes("**User Story**: [[US-012-review-entries]]"));
    assert.ok(lines.includes("**Related Solution Design**: [[SD-012-time-review]]"));
    const rows = lines.slice(lines.indexOf("## Journey Scenarios")).filter((l) => /^\| J-/.test(l));
    const j = JSON.parse(readFileSync(a.blueprint, "utf8")).journeys[0];
    assert.equal(rows.length, j.steps.length + j.alternates.length);
    for (const row of rows) assert.match(row, /\| US-012-AC1, US-012-AC2 \|/);
    assert.deepEqual(rows.map((r) => r.split(" | ")[0]), ["| J-review step 1", "| J-review step 2", "| J-review step 3", "| J-review alternate 1 — The entry is wrong", "| J-review alternate 2 — Saving fails — errorProne"]);
    assert.match(rows[3], /From step 2: Entry \| Choose Reject, then Choose Reject on Reject entry \| Entry is shown \|/);
    assert.equal(apply(a, "STP-012-journey-scenarios.patch").status, 0);
    assert.match(patch(a, "STP-013-journey-scenarios.patch"), /\| J-add step 1 \| US-013-AC1 \|/);
  });

  // @covers US-089-AC5
  test("AC5: a section HELIX already wrote differently gets no patch, and the report has both texts", () => {
    const a = app();
    const r = run(a);
    assert.equal(r.status, 0);
    const files = readdirSync(join(a.dir, "helix-proposals"));
    assert.ok(!files.includes("US-013-walkthrough.patch"));
    assert.ok(!files.filter((f) => f.endsWith(".patch")).some((f) => patch(a, f).includes("US-013-add-an-entry.md")), "no patch touches US-013's story");
    assert.match(r.stdout, /differs {2}docs\/helix\/01-frame\/user-stories\/US-013-add-an-entry\.md \(Walkthrough\)/);
    const report = readFileSync(join(a.dir, "helix-proposals/report.md"), "utf8");
    const section = report.slice(report.indexOf("### docs/helix/01-frame/user-stories/US-013-add-an-entry.md — Walkthrough"));
    assert.match(section, /HELIX says:\n\n````markdown\n1\. The user opens Entries and presses Import\.\n2\. The user uploads a file; the entries are listed\.\n````/);
    assert.match(section, /The blueprint gives:\n\n````markdown\n<!-- From blueprint journey J-add[^\n]*-->\n1\. On \*\*Entries\*\*, the user chooses \*\*New entry\*\*/);
    const json = JSON.parse(readFileSync(join(a.dir, "helix-proposals/proposals.json"), "utf8"));
    assert.deepEqual(json.disagreements.map((d) => [d.path, d.section]), [["docs/helix/01-frame/user-stories/US-013-add-an-entry.md", "Walkthrough"]]);

    // Once applied, a section says what the blueprint says: no patch, no disagreement.
    assert.equal(apply(a, "US-012-walkthrough.patch").status, 0);
    const again = propose(JSON.parse(readFileSync(a.blueprint, "utf8")), { blueprintFile: a.blueprint });
    assert.ok(!again.proposals.some((p) => p.id === "US-012-walkthrough"));
    assert.deepEqual(again.current.map((c) => c.section), ["Walkthrough"]);
  });

  // @covers US-089-AC6
  test("AC6: the same blueprint and HELIX documents give identical patches", () => {
    const a = app();
    assert.equal(run(a).status, 0);
    const first = tree(join(a.dir, "helix-proposals"));
    assert.equal(run(a, "app.blueprint.json", "--out", "helix-proposals").status, 0);
    const second = tree(join(a.dir, "helix-proposals"));
    assert.deepEqual(Object.keys(second).sort(), Object.keys(first).sort());
    for (const k of Object.keys(first)) assert.equal(second[k][1], first[k][1], k);
    // And in another directory: nothing in them depends on where it ran.
    const b = app();
    assert.equal(run(b).status, 0);
    const third = tree(join(b.dir, "helix-proposals"));
    for (const k of Object.keys(first)) assert.equal(third[k][1], first[k][1], k);
  });

  test("no HELIX marker: propose refuses with exit 2, naming the marker, and writes nothing", () => {
    const a = makeApp({ marker: false });
    apps.push(a);
    a.init();
    const r = run(a);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /No HELIX marker \(\.helix\.yml\) above app\.blueprint\.json/);
    assert.ok(!readdirSync(a.dir).includes("helix-proposals"));
    assert.equal(run(a, "missing.json").status, 2);
    assert.equal(run(a, "a.json", "b.json").status, 2);
  });

  test("a template without the anchor section: the draft goes to the end, and the problem is printed", () => {
    const a = app();
    // An installed HELIX whose story-test-plan template has no "Acceptance Criteria Test Mapping".
    const t = join(a.dir, ".claude/skills/helix/references/activities/03-test/artifacts/story-test-plan/template.md");
    a.write(".claude/skills/helix/references/activities/03-test/artifacts/story-test-plan/template.md", readFileSync(t, "utf8").replace("## Acceptance Criteria Test Mapping", "## Criteria Matrix"));
    const r = run(a);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /note {5}HELIX's story-test-plan template has no "Acceptance Criteria Test Mapping" section: "Journey Scenarios" is drafted at the end of docs\/helix\/03-test\/test-plans\/STP-012-review-entries\.md\./);
    const lines = added(patch(a, "STP-012-journey-scenarios.patch"));
    assert.ok(lines.lastIndexOf("## Journey Scenarios") > lines.indexOf("## UX Coverage"));
  });
});

const PROPOSED = fileURLToPath(new URL("../blueprint/helix-types/activities", import.meta.url));
const PROPOSAL = fileURLToPath(new URL("../../../docs/proposals/helix-ux-artifact-types/activities", import.meta.url));
const UX = { "interaction-state-diagram": "02-design", wireframe: "02-design", "screen-flow": "02-design", "user-journey-map": "01-frame" };

describe("US-104: HELIX's UX artifact types", () => {
  // @covers US-104-AC3
  test("AC3: an installed HELIX that defines the UX types gets each drafted from its template, as a patch", () => {
    const a = app();
    // A HELIX that has the proposed types (docs/proposals/helix-ux-artifact-types) installed.
    for (const [type, phase] of Object.entries(UX)) cpSync(join(PROPOSAL, phase, "artifacts", type), join(a.dir, ".claude/skills/helix/references/activities", phase, "artifacts", type), { recursive: true });
    // One already written: the queue's state diagram, whose statechart says something else.
    a.write("docs/helix/02-design/state-diagrams/ISD-007-queue.md", "---\nddx:\n  id: ISD-007\n  type: interaction-state-diagram\n---\n\n# ISD-007: Review queue States\n\n**Subject**: `queue` in [[SF-012]]\n\n## Statechart\n\n```mermaid\nstateDiagram-v2\n  [*] --> ideal\n```\n");
    const before = docs(a);
    const r = run(a);
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(docs(a), before, "no HELIX document is written");
    assert.doesNotMatch(r.stdout, /^missing/m);
    const files = readdirSync(join(a.dir, "helix-proposals"));
    assert.ok(!files.includes("drafts"));
    for (const f of ["ISD-007-states.patch", "WF-007-wireframe.patch", "ISD-001-states.patch", "WF-001-wireframe.patch", "SF-012-screen-flow.patch", "UJM-001-journey-map.patch", "UJM-002-journey-map.patch"]) assert.ok(files.includes(f), f);
    // The queue keeps its number (ISD-007, so WF-007); the next screen takes the first free one.
    assert.match(r.stdout, /^patch {4}helix-proposals\/WF-007-wireframe\.patch {2}docs\/helix\/02-design\/wireframes\/WF-007-queue\.md/m);

    // A new state diagram, from HELIX's template: every state, the statechart, the matrix and the transitions.
    const isd = patch(a, "ISD-001-states.patch");
    assert.match(isd, /^\+\+\+ b\/docs\/helix\/02-design\/state-diagrams\/ISD-001-entry\.md$/m);
    const doc = added(isd).join("\n");
    assert.match(doc, /^---\nddx:\n {2}id: ISD-001\n {2}type: interaction-state-diagram\n {2}status: draft\n {2}authoring:\n {4}home: repo\n {2}depends_on:\n {4}- SF-012\n {4}- WF-001\n---/);
    assert.match(doc, /^# ISD-001: Entry States$/m);
    assert.match(doc, /^\*\*Subject\*\*: `entry` in \[\[SF-012\]\] \| \*\*Wireframe\*\*: \[\[WF-001\]\] \| \*\*Stories\*\*: \[\[US-012\]\]$/m);
    assert.match(doc, /## Statechart\n\n<!--[^\n]*-->\n```mermaid\nstateDiagram-v2\n {4}ideal\n {4}loading\n {4}empty\n {4}error\n/);
    assert.match(doc, /## State Matrix\n\n<!--[^\n]*-->\n\| State \| Entered when \| User sees \| Available actions \| Announcement \| Exit \|/);
    assert.match(doc, /\| error \| Try again \| — \| loading \| From the blueprint \(J-review alternate 2 step 1\) \|/);
    assert.ok(!doc.includes("LOADED [items > 0]"), "the template's example statechart is replaced");
    assert.match(doc, /## Timing\n\n- \*\*Slow threshold\*\*: \[When loading/, "a section the blueprint cannot fill stays the template's");
    assert.equal(apply(a, "ISD-001-states.patch").status, 0);

    // The one HELIX has: its statechart differs, so no patch for it, both texts in the report; its other sections are drafted.
    assert.match(r.stdout, /^differs {2}docs\/helix\/02-design\/state-diagrams\/ISD-007-queue\.md \(Statechart\)/m);
    const own = patch(a, "ISD-007-states.patch");
    assert.match(own, /^--- a\/docs\/helix\/02-design\/state-diagrams\/ISD-007-queue\.md$/m);
    assert.ok(added(own).includes("## State Matrix") && !added(own).includes("## Statechart"));
    assert.equal(apply(a, "ISD-007-states.patch").status, 0);

    // The wireframe, the screen flow and the journey map, each from its template.
    const wf = added(patch(a, "WF-001-wireframe.patch")).join("\n");
    assert.match(wf, /\*\*Fidelity\*\*: mid/);
    assert.match(wf, /\| loading \| `entry\.loading\.compact\.png`, `entry\.loading\.expanded\.png` \| \[\[ISD-001\]\] \|/);
    const sf = added(patch(a, "SF-012-screen-flow.patch")).join("\n");
    assert.match(sf, /^# SF-012: Time review Screen Flow$/m);
    assert.match(sf, /\| J-review \| US-012-AC1, US-012-AC2 \| T1 → T3 \| — \|/);
    const ujm = added(patch(a, "UJM-001-journey-map.patch")).join("\n");
    assert.match(ujm, /^# UJM-001: Review entries$/m);
    assert.match(ujm, /\| 1\. Review queue \| On Review queue, the user chooses Open entry; Entry opens\. \|/);
    for (const f of ["WF-001-wireframe.patch", "SF-012-screen-flow.patch", "UJM-001-journey-map.patch"]) assert.equal(apply(a, f).status, 0, f);
  });

  // @covers US-104-AC3
  test("AC3: a HELIX without the UX types: propose names the missing types and writes the drafts under its output", () => {
    const a = app();
    const r = run(a);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /^missing {2}interaction-state-diagram, wireframe, screen-flow, user-journey-map: not defined by the installed HELIX; drafted under helix-proposals\/drafts\/ instead of patched$/m);
    assert.match(r.stdout, /^draft {4}helix-proposals\/drafts\/docs\/helix\/02-design\/state-diagrams\/ISD-001-queue\.md {2}\(interaction-state-diagram\)$/m);
    const files = readdirSync(join(a.dir, "helix-proposals"));
    assert.ok(!files.some((f) => /^(ISD|WF|SF|UJM)-/.test(f)), "no patch for a type HELIX does not define");
    const draft = (p) => readFileSync(join(a.dir, "helix-proposals/drafts", p), "utf8");
    const isd = draft("docs/helix/02-design/state-diagrams/ISD-002-entry.md");
    assert.match(isd, /^---\nddx:\n {2}id: ISD-002\n {2}type: interaction-state-diagram\n/);
    assert.match(isd, /> Drafted by `ux-builder-blueprint propose` from the blueprint and ux-builder's proposed interaction-state-diagram template \(docs\/proposals\/helix-ux-artifact-types\)\./);
    for (const h of ["## Scope", "## State Inventory", "## Statechart", "## State Matrix", "## Events and Transitions", "## Timing", "## Open Questions"]) assert.ok(isd.includes(`\n${h}\n`), h);
    assert.match(draft("docs/helix/02-design/wireframes/WF-002-entry.md"), /^# WF-002: Entry$/m);
    assert.match(draft("docs/helix/02-design/screen-flows/SF-012-time-review.md"), /^# SF-012: Time review Screen Flow$/m);
    assert.match(draft("docs/helix/01-frame/journey-maps/UJM-002-add-an-entry.md"), /^# UJM-002: Add an entry$/m);
    // A screen with no declared states: ideal only, and the missing states noted.
    assert.match(draft("docs/helix/02-design/state-diagrams/ISD-005-settings.md"), /- "Settings" declares no states: the diagram has the ideal state only\. Missing: empty, loading, error\./);
    const report = readFileSync(join(a.dir, "helix-proposals/report.md"), "utf8");
    assert.match(report, /## HELIX UX types\n\n- Defined by the installed HELIX \(patches above\): none\n- Missing from it \(drafts below, not patches\): interaction-state-diagram, wireframe, screen-flow, user-journey-map/);
    const json = JSON.parse(readFileSync(join(a.dir, "helix-proposals/proposals.json"), "utf8"));
    assert.deepEqual(json.uxTypes.missing, Object.keys(UX));
    assert.equal(json.drafts.length, 6 * 2 + 1 + 2);
    // Drafts are deterministic, and a later run replaces them.
    const first = tree(join(a.dir, "helix-proposals/drafts"));
    assert.equal(run(a).status, 0);
    const second = tree(join(a.dir, "helix-proposals/drafts"));
    assert.deepEqual(Object.keys(second).sort(), Object.keys(first).sort());
    for (const k of Object.keys(first)) assert.equal(second[k][1], first[k][1], k);
  });

  test("the bundled UX templates are the proposal's (docs/proposals/helix-ux-artifact-types)", () => {
    for (const [type, phase] of Object.entries(UX)) for (const f of ["template.md", "meta.yml"]) {
      assert.equal(readFileSync(join(PROPOSED, phase, "artifacts", type, f), "utf8"), readFileSync(join(PROPOSAL, phase, "artifacts", type, f), "utf8"), `${type}/${f}`);
    }
  });
});

describe("propose's pieces", () => {
  test("a section is unwritten when empty, the template's text, or only placeholders", () => {
    assert.equal(unwritten("", "x"), true);
    assert.equal(unwritten("[Step-by-step description of the\njourney.]\n\n1. User [action]\n2. System [response]", null), true);
    assert.equal(unwritten("```mermaid\nsequenceDiagram\n    %% Add sequence\n```", null), true);
    assert.equal(unwritten("| A | B |\n|---|---|\n| [x] | [y] |", null), true);
    assert.equal(unwritten("1. The user opens the app.", null), false);
    assert.equal(unwritten("```mermaid\nstateDiagram-v2\n  [*] --> ideal\n```", null), false, "a statechart's [*] is not a placeholder");
  });

  test("unified diffs: hunks with three lines of context, joined when close, and a new file from /dev/null", () => {
    const a = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`).join("\n") + "\n";
    const b = a.replace("line 5\n", "line five\n").replace("line 7\n", "line seven\n").replace("line 18\n", "");
    assert.equal(unifiedDiff("f.md", a, b), [
      "diff --git a/f.md b/f.md", "--- a/f.md", "+++ b/f.md",
      "@@ -2,9 +2,9 @@", " line 2", " line 3", " line 4", "-line 5", "+line five", " line 6", "-line 7", "+line seven", " line 8", " line 9", " line 10",
      "@@ -15,6 +15,5 @@", " line 15", " line 16", " line 17", "-line 18", " line 19", " line 20", ""].join("\n"));
    assert.equal(unifiedDiff("f.md", a, a), "");
    assert.equal(unifiedDiff("n.md", null, "a\nb\n"), "diff --git a/n.md b/n.md\nnew file mode 100644\n--- /dev/null\n+++ b/n.md\n@@ -0,0 +1,2 @@\n+a\n+b\n");
  });
});
