/* HELIX read as it is, and the assessment's manifest and runs beside the
   design (US-151; FEAT-018 GDL-82; CONTRACT-006 Manifest).

     npm test --workspace @ux-builder/audit */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { after, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { stringify } from "yaml";
import { reportsOf } from "@ux-builder/ui/blueprint/paths";
import { bind, instances, sameType } from "../assess/helix.mjs";
import { load } from "../assess/manifest.mjs";
import { makeRepo } from "./fixtures/helix-repo.mjs";

const CLI = fileURLToPath(new URL("../cli.mjs", import.meta.url));
const repos = [];
after(() => { for (const r of repos) r.remove(); });
const MISTYPED = "---\nddx:\n  id: US-004\n  type: user-story\n---\n\n# US-004: Undo an approval\n\n## Acceptance Criteria\n\n- [ ] **US-004-AC1** — Given an approval, when undo is chosen, then the entry returns to the queue.\n";
const MANIFEST = {
  version: 1, app: { name: "Review app" },
  run: { baseUrl: "http://127.0.0.1:4173/", environment: "local" },
  roles: [{ id: "reviewer", auth: "none" }],
  journeys: [{ id: "J-review", story: "US-001", priority: "critical", role: "reviewer", entry: "/" }],
  restrictions: { writes: "report-only" },
};
/* A HELIX repo with the manifest at `at`, collected from its top with no --manifest. */
function collected({ at = "ux-assessment.yml", files = {}, docs = false } = {}) {
  const r = makeRepo({ files });
  repos.push(r);
  if (docs) mkdirSync(join(r.dir, "docs/ux-builder/blueprint"), { recursive: true });
  mkdirSync(join(r.dir, at, ".."), { recursive: true });
  writeFileSync(join(r.dir, at), stringify(MANIFEST));
  const out = spawnSync(process.execPath, [CLI, "assess", "collect", "--run", "R-20261026T120000Z"], { cwd: r.dir, encoding: "utf8" });
  return { r, out };
}

describe("US-151: HELIX read as it is; the assessment beside the design", () => {
  // @covers US-151-AC2
  test("AC2: a story typed user-story is read as user-stories and reported as information; an untyped one is read, and the warning says nothing is missing", () => {
    assert.ok(sameType("user-story", "user-stories") && sameType("User_Stories", "user-stories") && !sameType("user-stories", "feature-specification"));
    const r = makeRepo({ files: { "docs/helix/01-frame/user-stories/US-004-undo.md": MISTYPED } });
    repos.push(r);
    const b = bind(r.dir, {});
    const us4 = instances(b.flow, b.types, { repo: r.dir }).find((d) => d.path.endsWith("US-004-undo.md"));
    assert.deepEqual([us4.type, us4.typedBy, us4.written, us4.id], ["user-stories", "corrected", "user-story", "US-004"]);
    const { r: c, out } = collected({ files: { "docs/helix/01-frame/user-stories/US-004-undo.md": MISTYPED } });
    assert.equal(out.status, 0, out.stderr + out.stdout);
    const req = JSON.parse(readFileSync(join(c.dir, "ux-assessment/R-20261026T120000Z/requirements.json"), "utf8"));
    assert.ok(req.criteria.some((x) => x.id === "US-004-AC1"), "its criteria are read");
    const { problems } = req;
    const corrected = problems.find((p) => p.kind === "type-corrected");
    assert.deepEqual([corrected.severity, corrected.detail], ["info", "ddx.type user-story read as HELIX's user-stories; it was read, and nothing is missing"]);
    const untyped = problems.find((p) => p.kind === "untyped" && p.path.endsWith("US-003-untyped.md"));
    assert.match(untyped.detail, /^read as user-stories by its location, so nothing is missing; when it is next edited in HELIX, its frontmatter can name the type exactly: ddx\.type user-stories$/);
  });

  // @covers US-151-AC4
  test("AC4: in an app with docs/ux-builder/, the manifest there is found, its paths resolve from the app, and runs go to docs/ux-builder/assessments/", () => {
    const { r, out } = collected({ docs: true, at: "docs/ux-builder/ux-assessment.yml" });
    assert.equal(out.status, 0, out.stderr + out.stdout);
    assert.ok(existsSync(join(r.dir, "docs/ux-builder/assessments/R-20261026T120000Z/requirements.json")));
    assert.ok(!existsSync(join(r.dir, "ux-assessment")));
    assert.equal(load(join(r.dir, "docs/ux-builder/ux-assessment.yml")).dir, r.dir, "relative paths start at the app");
    assert.deepEqual(reportsOf(r.dir), { manifest: "docs/ux-builder/ux-assessment.yml", assessments: "docs/ux-builder/assessments", auditReport: "docs/ux-builder/audit-report", layout: "current" });
  });

  // @covers US-151-AC4
  test("AC4: an app that keeps ux-assessment.yml at its top keeps its runs and audit report there too, until it migrates; an app without docs/ux-builder/ is unchanged", () => {
    const { r, out } = collected({ docs: true });
    assert.equal(out.status, 0, out.stderr + out.stdout);
    assert.ok(existsSync(join(r.dir, "ux-assessment/R-20261026T120000Z/requirements.json")));
    assert.deepEqual(reportsOf(r.dir), { manifest: "ux-assessment.yml", assessments: "ux-assessment", auditReport: "audit-report", layout: "legacy" });
    const plain = makeRepo();
    repos.push(plain);
    assert.equal(reportsOf(plain.dir).auditReport, "audit-report");
  });
});
