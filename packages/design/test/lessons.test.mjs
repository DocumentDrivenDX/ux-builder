/* Lessons from the first guided session: IDs explained, HELIX read as it
   is, a choice of audit, and the reports beside the design (US-151;
   FEAT-018 GDL-82; CONTRACT-008 Layout).

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { explain, explainText, overview, overviewText, status } from "../index.mjs";
import { cli, tempApp } from "./helpers.mjs";

const SKILL = readFileSync(new URL("../skill/ux-builder-design/SKILL.md", import.meta.url), "utf8");
const ASSESS_SKILL = readFileSync(new URL("../../audit/skill/ux-builder-assess/SKILL.md", import.meta.url), "utf8");

describe("US-151: IDs explained, HELIX read as it is, a choice of audit, the reports beside the design", () => {
  // @covers US-151-AC1
  test("AC1: explain names what a HELIX ID is and where it lives; explain ids lists only HELIX's IDs and pseudonyms; the overview and the skill say to show names", () => {
    const cases = {
      "BR-1": [/^BR-1: Business rule\. Where: defined once in HELIX/, "business rule"],
      "US-3": [/^US-3: User story\./, "user story"],
      "US-3-AC2": [/^US-3-AC2: Acceptance criterion\./, "acceptance criterion"],
      "ADR-008": [/^ADR-008: Decision, a HELIX ADR/, null],
      "UF-4": [/^UF-4: User flow, one per feature\./, null],
      "UF-4-01-list": [/^UF-4-01-list: Wireframe of one view in a user flow\./, null],
      P1: [/^P1: Test participant, by pseudonym\./, null],
    };
    for (const [id, [line, term]] of Object.entries(cases)) {
      const r = explain({ term: id });
      assert.match(explainText(r), line, id);
      assert.deepEqual(r.terms.map((t) => t.term), term ? [term] : [], id);
    }
    // From the command line too, and every kind at once: HELIX's own and pseudonyms, nothing of ux-builder's (ADR-042 decision 5).
    const a = tempApp();
    assert.match(cli(a, ["explain", "BR-4"]).stdout, /^BR-4: Business rule\./);
    const all = explain({ term: "ids" }).ids.map((x) => x.id);
    assert.deepEqual(all, ["US-<n>-AC<m>", "US-<n>", "FEAT-<n>", "BR-<n>", "ADR-<nnn>", "UF-<n>", "UF-<n>-<nn>-<view>", "UJM-<n>", "P<n>"]);
    assert.equal(cli(a, ["explain", "U-1"]).status, 2, "U- is not an ID the person sees");
    assert.match(overviewText(overview()), /Everything is named by what it says[\s\S]*The only IDs you will see are HELIX's own[\s\S]*explain ids/);
    assert.match(SKILL, /\*\*Show names, not IDs\.\*\*[\s\S]*"weekend anglers"[\s\S]*`ux-builder-design explain <ID>`[\s\S]*`explain ids`/);
  });

  // @covers US-151-AC2
  test("AC2: both skills tell the agent never to hand the person a command to edit HELIX or to guess a HELIX field", () => {
    assert.match(SKILL, /Never hand the person a command \(a `sed`, a script, an edit to paste\) to\s+change their HELIX documents, and never guess a HELIX field's name or\s+value/);
    assert.match(SKILL, /a story is a story by its `US-<n>` ID, with or\s+without a type tag/);
    assert.match(ASSESS_SKILL, /Never give the\s+person a command to edit their HELIX documents or guess a HELIX field/);
    assert.match(ASSESS_SKILL, /`type-corrected`, such as `user-story` read as `user-stories`/);
  });

  // @covers US-151-AC3
  test("AC3: asked for an audit, both skills explain the UI audit and the usability assessment and ask which, or both; explain defines them", () => {
    assert.match(SKILL, /\*\*When the person asks for an audit, ask which\.\*\*[\s\S]*the \*\*UI audit\*\*[\s\S]*the \*\*usability assessment\*\*[\s\S]*Don't run either until they have\s+answered\./);
    assert.match(ASSESS_SKILL, /ask first whether they want the \*\*UI audit\*\*[\s\S]*the \*\*usability assessment\*\*[\s\S]*or \*\*both\*\*[\s\S]*Run only what they choose\./);
    assert.match(explainText(explain({ term: "UI audit" })), /^UI audit: An automatic check of the running app in every theme/);
    assert.match(explainText(explain({ term: "usability assessment" })), /^usability assessment: A walk through each journey from your user stories/);
    const step7 = explain({ step: 7 }).terms.map((t) => t.term);
    for (const t of ["UI audit", "usability assessment"]) assert.ok(step7.includes(t), t);
  });

  // @covers US-151-AC4
  test("AC4: an app on the new layout that keeps its reports at its top: status lists them; migrate moves them and rewrites the references, leaving a workflow's artifact name", () => {
    const a = tempApp();
    writeFileSync(join(a, "ux-assessment.yml"), "version: 1\nevidence:\n  out: ux-assessment/\n");
    mkdirSync(join(a, "ux-assessment/R-1"), { recursive: true });
    writeFileSync(join(a, "ux-assessment/R-1/backlog.json"), "{}");
    mkdirSync(join(a, "audit-report"), { recursive: true });
    writeFileSync(join(a, "audit-report/report.json"), "{}");
    writeFileSync(join(a, ".gitignore"), "node_modules\naudit-report\nux-assessment/\n");
    mkdirSync(join(a, ".github/workflows"), { recursive: true });
    writeFileSync(join(a, ".github/workflows/ci.yml"), "      - uses: actions/upload-artifact@v4\n        with:\n          name: audit-report\n          path: audit-report\n");
    const s = status(a);
    assert.deepEqual(s.toMigrate, ["ux-assessment.yml", "ux-assessment", "audit-report"]);
    assert.match(s.text, /Still at the app's top: ux-assessment\.yml, ux-assessment, audit-report; run ux-builder-design migrate to move them under docs\/ux-builder\//);
    const r = JSON.parse(cli(a, ["migrate", "--json"]).stdout);
    assert.equal(r.migrated, true);
    for (const f of ["docs/ux-builder/ux-assessment.yml", "docs/ux-builder/assessments/R-1/backlog.json", "docs/ux-builder/audit-report/report.json"]) assert.ok(existsSync(join(a, f)), f);
    for (const f of ["ux-assessment.yml", "ux-assessment", "audit-report"]) assert.ok(!existsSync(join(a, f)), f);
    assert.match(readFileSync(join(a, "docs/ux-builder/ux-assessment.yml"), "utf8"), /out: docs\/ux-builder\/assessments\//);
    assert.equal(readFileSync(join(a, ".gitignore"), "utf8"), "node_modules\ndocs/ux-builder/audit-report\ndocs/ux-builder/assessments/\n");
    assert.equal(readFileSync(join(a, ".github/workflows/ci.yml"), "utf8"), "      - uses: actions/upload-artifact@v4\n        with:\n          name: audit-report\n          path: docs/ux-builder/audit-report\n");
    assert.deepEqual(status(a).toMigrate, []);
  });
});
