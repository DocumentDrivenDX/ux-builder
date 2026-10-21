/* The assessment's HELIX binding: marker, flow and catalogue, resolved and
   refused as HELIX does (FEAT-009 HLX-01 to HLX-04; US-056-AC4; STP-056).

     npm test --workspace @ux-builder/audit */

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, test } from "node:test";
import { stringify } from "yaml";
import { bind, bindCatalog, HelixError, instances, readMarker } from "../assess/helix.mjs";
import { load, validate } from "../assess/manifest.mjs";
import { makeRepo } from "./fixtures/helix-repo.mjs";

const repos = [];
const repo = (o) => { const r = makeRepo(o); repos.push(r); return r; };
after(() => { for (const r of repos) r.remove(); });
const refused = (marker) => { const r = repo({ files: { ".helix.yml": marker } }); try { bind(r.dir, {}); return null; } catch (e) { assert.ok(e instanceof HelixError, e.message); return e; } };

describe("US-056-AC4: the manifest binds HELIX as HELIX does", () => {
  // @covers US-056-AC4
  test("a marker HELIX refuses stops with HELIX's reason", () => {
    assert.equal(refused("flows: [ {id: helix, root: docs/helix/ ").code, "M001");
    assert.equal(refused("flows:\n  - id: helix\n    root: ../elsewhere/\n").code, "M002");
    assert.equal(refused("flows:\n  - id: helix\n    root: docs/helix/\n  - id: helix\n    root: docs/\n").code, "M003");
    assert.equal(refused("flows:\n  - id: helix\n    root: docs/helix/\ndefaults:\n  flow: other\n").code, "M004");
    assert.equal(refused("flows:\n  - id: helix\n    root: docs/missing/\n").code, "M006");
  });

  // @covers US-056-AC4
  test("two flows and no choice lists both; a choice or defaults.flow resolves", () => {
    const two = "flows:\n  - id: helix\n    root: docs/helix/\n  - id: helix-infra\n    root: workflows/\n";
    const e = refused(two);
    assert.equal(e.code, "ambiguous");
    assert.match(e.message, /helix \(root docs\/helix\), helix-infra \(root workflows\)/);
    const r = repo({ files: { ".helix.yml": two } });
    assert.equal(bind(r.dir, { flow: "helix-infra" }).flow.id, "helix-infra");
    const d = repo({ files: { ".helix.yml": two + "defaults:\n  flow: helix\n" } });
    assert.equal(bind(d.dir, {}).flow.id, "helix");
    // Through validate: the problem is on /helix, with the candidates.
    writeFileSync(join(r.dir, "ux-assessment.yml"), stringify({ version: 1, app: { name: "x" }, run: { baseUrl: "http://127.0.0.1:1/", environment: "local" }, roles: [{ id: "a" }], journeys: [{ id: "J-a", story: "US-001", priority: "critical", role: "a", entry: "/" }], restrictions: { writes: "report-only" } }));
    const v = validate(load(join(r.dir, "ux-assessment.yml")));
    assert.match(v.problems.find((p) => p.path === "/helix").message, /set helix.flow to one of/);
  });

  // @covers US-056-AC4
  test("a valid marker records the flow, its root and the catalogue that bound, with its version", () => {
    const r = repo({ files: { "workflows/../.claude-plugin/plugin.json": JSON.stringify({ name: "helix", version: "9.9.9" }) } });
    const b = bind(join(r.dir, "docs"), {}); // found walking up from a subdirectory
    assert.equal(b.marker.file, join(r.dir, ".helix.yml"));
    assert.deepEqual([b.flow.id, b.flow.rootRel], ["helix", "docs/helix"]);
    assert.equal(b.catalog.source, "repository");
    assert.equal(b.catalog.version, "9.9.9");
    assert.deepEqual(b.types.map((t) => t.id).sort(), ["feature-specification", "prd", "product-vision", "user-stories"]);
    // A marker pointer wins over the vendored catalogue; an explicit manifest path wins over both.
    const alt = join(r.dir, "vendor/helix");
    mkdirSync(alt, { recursive: true }); writeFileSync(join(alt, "graph.yml"), "version: 1\n");
    r.write(".helix.yml", "flows:\n  - id: helix\n    root: docs/helix/\ngraph: vendor/helix/graph.yml\n");
    assert.equal(bindCatalog(readMarker(join(r.dir, ".helix.yml"))).source, "marker");
    assert.equal(bindCatalog(readMarker(join(r.dir, ".helix.yml")), "workflows").source, "manifest");
    // Without any catalogue, it says so rather than guessing.
    const bare = repo({ omit: ["workflows/graph.yml"] });
    const none = bindCatalog(readMarker(join(bare.dir, ".helix.yml")), "auto", { env: {}, home: mkdtempSync(join(tmpdir(), "home-")) });
    assert.equal(none.source, "none");
  });

  test("instances are typed by frontmatter, else by the catalogue's location and naming, and keep their links", () => {
    const r = repo();
    const b = bind(r.dir, {});
    const docs = instances(b.flow, b.types, { repo: r.dir });
    const by = Object.fromEntries(docs.map((d) => [d.path.split("/").pop(), d]));
    assert.equal(by["US-001-review-a-queue.md"].typedBy, "frontmatter");
    assert.equal(by["US-003-untyped.md"].typedBy, "location");
    assert.equal(by["US-003-untyped.md"].type, "user-stories");
    assert.equal(by["US-003-untyped.md"].id, null);
    assert.deepEqual(by["US-001-review-a-queue.md"].links, [{ kind: "informed_by", to: "FEAT-001" }]);
    assert.equal(instances(b.flow, b.types, { repo: r.dir, include: ["01-frame/user-stories/**"] }).length, 3);
    assert.equal(instances(b.flow, b.types, { repo: r.dir, exclude: ["**/US-003-*"] }).some((d) => d.path.includes("US-003")), false);
  });
});
