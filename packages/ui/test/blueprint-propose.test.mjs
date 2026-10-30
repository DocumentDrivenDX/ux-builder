/* HELIX content drafted from the blueprint, as proposals (FEAT-012 DRF-01,
   DRF-02; US-089; ADR-030; CONTRACT-004 Flows and journeys): the review
   blueprint in a HELIX-governed app (test/helix-app.mjs) with HELIX's
   templates installed (v0.20.0's user-flow, wireframe, user-journey-map and
   DESIGN.md).

     npm test --workspace @ux-builder/ui */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
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

  // @covers US-089-AC3
  test("AC3: a patch for DESIGN.md's Modalities, Size Classes and App Frame, from the blueprint's supports, before Navigation and Active State", () => {
    const a = app();
    const b = JSON.parse(readFileSync(a.blueprint, "utf8"));
    b.supports = { ...b.supports, modalities: ["responsive-web", "hybrid-chat"], frame: "top-nav" };
    writeFileSync(a.blueprint, JSON.stringify(b, null, 2));
    const r = run(a);
    assert.equal(r.status, 0, r.stderr);
    const p = patch(a, "design-system-modalities.patch");
    assert.match(p, /^--- a\/docs\/helix\/02-design\/DESIGN\.md$/m);
    assert.deepEqual(added(p).filter((l) => l.startsWith("- ")), [
      "- **Supported modalities**: screen, chat (responsive-web, hybrid-chat)",
      "- **Size classes**: compact below 600 px, expanded from 840 px",
      "- **App frame**: top-nav — The destinations across a top bar; a bottom bar on phones",
    ]);
    assert.match(r.stdout, /design-system-modalities\.patch {2}docs\/helix\/02-design\/DESIGN\.md \(Modalities, Size Classes and App Frame\)/);
    assert.equal(apply(a, "design-system-navigation.patch").status, 0);
    assert.equal(apply(a, "design-system-modalities.patch").status, 0, "applies after the navigation patch");
    const text = readFileSync(join(a.dir, "docs/helix/02-design/DESIGN.md"), "utf8");
    assert.ok(text.indexOf("# DESIGN.md") < text.indexOf("## Modalities, Size Classes and App Frame") && text.indexOf("## Modalities, Size Classes and App Frame") < text.indexOf("## Navigation and Active State"));
    // Without a frame, the recommendation for the destinations, for the person to choose.
    delete b.supports.frame;
    writeFileSync(a.blueprint, JSON.stringify(b, null, 2));
    const again = propose(b, { blueprintFile: a.blueprint });
    assert.ok(again.disagreements.some((d) => d.section === "Modalities, Size Classes and App Frame" && /recommends top-nav/.test(d.blueprint)));
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

const FLOW = "docs/helix/02-design/flows/UF-012-time-review";

describe("US-104: HELIX's UX artifact types", () => {
  // @covers US-104-AC3
  test("AC3: HELIX's user-flow for the feature and a wireframe per view in its folder, each from its template, as patches", () => {
    const a = app();
    const before = docs(a);
    const r = run(a);
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(docs(a), before, "no HELIX document is written");
    assert.doesNotMatch(r.stdout, /^(missing|draft) /m, "no draft fallback");
    const files = readdirSync(join(a.dir, "helix-proposals"));
    assert.ok(!files.includes("drafts"));
    assert.ok(!files.some((f) => /^(ISD|WF|SF)-/.test(f)), "none of ux-builder's own types");
    assert.match(r.stdout, /^patch {4}helix-proposals\/UF-012-user-flow\.patch {2}docs\/helix\/02-design\/flows\/UF-012-time-review\/UF-012\.md \(Scope, Views, Flow Diagram, Transitions, Alternate Paths, Story Traceability, Dead Ends\)$/m);

    // The user flow: numbered as the feature, from HELIX's template, with the authoring home HELIX's validator needs.
    const uf = added(patch(a, "UF-012-user-flow.patch")).join("\n");
    assert.match(uf, /^---\nddx:\n {2}id: UF-012\n {2}type: user-flow\n {2}status: draft\n {2}authoring:\n {4}home: repo\n {2}depends_on:\n {4}- FEAT-012\n {4}- US-012\n---/);
    assert.match(uf, /^# UF-012: Time review User Flow$/m);
    assert.match(uf, /^\*\*Feature\*\*: \[\[FEAT-012\]\] \| \*\*Solution design\*\*: \[\[SD-012\]\] \| \*\*Journey maps\*\*: \[\[UJM-001\]\], \[\[UJM-002\]\]$/m);
    for (const h of ["## Scope", "## Views", "## Flow Diagram", "## Transitions", "## Alternate Paths", "## Story Traceability", "## Dead Ends"]) assert.ok(uf.includes(`\n${h}\n`), h);
    assert.match(uf, /^\| Review queue \| screen \| WorkQueue \| US-012 \| \[\[UF-012-01-queue\]\] \|$/m);
    assert.match(uf, /^\| Reject entry \| modal \| dialog over Entry \| — \| \[\[UF-012-02-entry\]\] \(its dialog\) \|$/m);
    assert.match(uf, /^\| Approve \| Entry \| button \| none \| Review queue \| the view it opens \| full view \|$/m);
    assert.match(uf, /^\| J-review \| — \| US-012-AC1, US-012-AC2 \| Open entry → Approve → Review queue \|$/m);
    assert.match(uf, /## Dead Ends\n\n<!--[^\n]*-->\n- "Legacy report" is unreachable/);
    assert.ok(!uf.includes("[Action]"), "the template's placeholder rows are replaced");
    assert.equal(apply(a, "UF-012-user-flow.patch").status, 0);

    // A wireframe per screen, nested under the flow: UF-<n>-<nn>-<view>, the state diagram in States and Events.
    const ids = ["01-queue", "02-entry", "03-list", "04-form", "05-settings", "06-legacy"];
    for (const id of ids) assert.match(r.stdout, new RegExp(`^patch {4}helix-proposals/UF-012-${id}-wireframe\\.patch {2}${FLOW}/UF-012-${id}\\.md \\(Scope and Fidelity, Layouts, States and Events, Accessibility, Open Questions\\)$`, "m"), id);
    const wf = added(patch(a, "UF-012-02-entry-wireframe.patch")).join("\n");
    assert.match(wf, /^---\nddx:\n {2}id: UF-012-02-entry\n {2}type: wireframe\n {2}status: draft\n {2}authoring:\n {4}home: repo\n {2}depends_on:\n {4}- UF-012\n {4}- US-012\n---/);
    assert.match(wf, /^# UF-012-02-entry: Entry$/m);
    assert.match(wf, /^\*\*User flow\*\*: \[\[UF-012\]\] view `entry` \| \*\*Stories\*\*: \[\[US-012\]\]$/m);
    assert.match(wf, /^- \*\*Modality\*\*: screen$/m);
    assert.match(wf, /^- \*\*Fidelity\*\*: mid$/m);
    assert.match(wf, /### compact\n\n!\[UF-012-02-entry compact\]\(assets\/UF-012-02-entry-compact\.png\)/);
    assert.match(wf, /### Annotations\n\n<!--[^\n]*-->\n\| Element \| Kind \| Annotation \| Size classes \| Links \|/);
    assert.match(wf, /^\| Approve \| control \| The primary action: opens Review queue \| all \| transition "Approve" \|$/m);
    assert.match(wf, /## States and Events\n\n### States\n\n<!--[^\n]*-->\n\| State \| Applies \| Entered when \| Person sees \| Available actions \| Announcement \| Exit \|/);
    for (const st of ["ideal", "empty", "loading", "partial", "error", "offline", "slow", "permission-denied", "success"]) assert.match(wf, new RegExp(`^\\| ${st} \\| (yes|no: [^|]+) \\|`, "m"), st);
    assert.match(wf, /### Statechart\n\n<!--[^\n]*-->\n```mermaid\nstateDiagram-v2\n {4}ideal\n {4}loading\n {4}empty\n {4}error\n/);
    assert.match(wf, /### Events\n\n<!--[^\n]*-->\n\| Event \| From \| Guard \| To \| Effect \|/);
    assert.match(wf, /^\| Try again \| error \| none \| loading \| From the blueprint \(J-review alternate 2 step 1\) \|$/m);
    assert.ok(!wf.includes("LOADED [items > 0]") && !wf.includes("┌"), "the template's example statechart and box drawing are replaced");
    for (const id of ids) assert.equal(apply(a, `UF-012-${id}-wireframe.patch`).status, 0, id);

    // Once applied, a second run finds them current; a new screen takes the next free view number.
    const b = JSON.parse(readFileSync(a.blueprint, "utf8"));
    b.screens.push({ id: "help", title: "Help", pattern: "RecordDetail", stories: ["US-012"], states: ["loading", "error"], actions: [{ id: "back", label: "Back", to: "back" }] });
    const again = propose(b, { blueprintFile: a.blueprint });
    assert.ok(!again.proposals.some((p) => /^UF-012-0[1-6]-/.test(p.id)), "the applied wireframes are current");
    assert.ok(again.proposals.some((p) => p.id === "UF-012-07-help-wireframe" && p.path === `${FLOW}/UF-012-07-help.md`));
  });

  // @covers US-104-AC3
  test("AC3: a wireframe HELIX already has keeps its number, and a section it wrote differently is reported, not patched", () => {
    const a = app();
    a.write(`${FLOW}/UF-012-04-queue.md`, "---\nddx:\n  id: UF-012-04-queue\n  type: wireframe\n  authoring:\n    home: repo\n---\n\n# UF-012-04-queue: Review queue\n\n**User flow**: [[UF-012]] view `queue`\n\n## States and Events\n\nThe queue is always ready.\n");
    const r = run(a);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /^differs {2}docs\/helix\/02-design\/flows\/UF-012-time-review\/UF-012-04-queue\.md \(States and Events\)/m);
    const own = patch(a, "UF-012-04-queue-wireframe.patch");
    assert.match(own, /^--- a\/docs\/helix\/02-design\/flows\/UF-012-time-review\/UF-012-04-queue\.md$/m);
    assert.ok(added(own).includes("## Layouts") && !added(own).includes("## States and Events"));
    assert.equal(apply(a, "UF-012-04-queue-wireframe.patch").status, 0);
    // The other screens skip the number taken.
    const files = readdirSync(join(a.dir, "helix-proposals"));
    assert.deepEqual(files.filter((f) => /^UF-012-\d\d-/.test(f)).sort(), ["UF-012-01-entry-wireframe.patch", "UF-012-02-list-wireframe.patch", "UF-012-03-form-wireframe.patch", "UF-012-04-queue-wireframe.patch", "UF-012-05-settings-wireframe.patch", "UF-012-06-legacy-wireframe.patch"]);
    assert.match(added(patch(a, "UF-012-user-flow.patch")).join("\n"), /^\| Review queue \| screen \| WorkQueue \| US-012 \| \[\[UF-012-04-queue\]\] \|$/m);
  });

  // @covers US-104-AC3
  test("AC3: a user-journey-map per journey, from HELIX's template", () => {
    const a = app();
    assert.equal(run(a).status, 0);
    const p = patch(a, "UJM-001-journey-map.patch");
    assert.match(p, /^\+\+\+ b\/docs\/helix\/01-frame\/journey-maps\/UJM-001-review-entries\.md$/m);
    const ujm = added(p).join("\n");
    assert.match(ujm, /^# UJM-001: Review entries$/m);
    assert.match(ujm, /^- \*\*Person\*\*: /m);
    assert.match(ujm, /### Goals and Expectations\n/, "the template's subsection is kept");
    assert.match(ujm, /\| 1\. Review queue \| On Review queue, the user chooses Open entry; Entry opens\. \|/);
    assert.equal(apply(a, "UJM-001-journey-map.patch").status, 0);
    assert.match(patch(a, "UJM-002-journey-map.patch"), /UJM-002-add-an-entry\.md/);
  });

  // @covers US-104-AC3
  test("AC3: an installed HELIX without the UX types: the documents are still patches at HELIX's location, drafted from the blueprint alone, and the run says so", () => {
    const a = app();
    for (const t of ["02-design/artifacts/user-flow", "02-design/artifacts/wireframe", "01-frame/artifacts/user-journey-map"]) rmSync(join(a.dir, ".claude/skills/helix/references/activities", t), { recursive: true });
    const r = run(a);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /^note {5}HELIX has no template for the user-flow type \(activities\/02-design\/artifacts\/user-flow\/template\.md\): docs\/helix\/02-design\/flows\/UF-012-time-review\/UF-012\.md is drafted from the blueprint alone\.$/m);
    assert.match(r.stdout, /^note {5}HELIX has no template for the wireframe type/m);
    assert.ok(!readdirSync(join(a.dir, "helix-proposals")).includes("drafts"));
    const uf = added(patch(a, "UF-012-user-flow.patch")).join("\n");
    assert.match(uf, /^---\nddx:\n {2}id: UF-012\n {2}type: user-flow\n {2}status: draft\n {2}authoring:\n {4}home: repo\n/);
    for (const h of ["## Scope", "## Views", "## Dead Ends"]) assert.ok(uf.includes(`\n${h}\n`), h);
    assert.equal(apply(a, "UF-012-user-flow.patch").status, 0);
    assert.match(patch(a, "UF-012-05-settings-wireframe.patch"), /^\+\+\+ b\/docs\/helix\/02-design\/flows\/UF-012-time-review\/UF-012-05-settings\.md$/m);
    // A screen with no declared states: ideal only, and the missing states noted.
    assert.match(added(patch(a, "UF-012-05-settings-wireframe.patch")).join("\n"), /- "Settings" declares no states: the diagram has the ideal state only\. Missing: empty, loading, error\./);
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
