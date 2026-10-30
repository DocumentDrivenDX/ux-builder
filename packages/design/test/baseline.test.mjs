/* An existing app starts from HELIX's backfill (US-115-AC5; FEAT-018
   GDL-74; ADR-042): the baseline command and document are retired.

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { emptyState } from "../index.mjs";
import { cli, tempApp } from "./helpers.mjs";

describe("an existing app", () => {
  // @covers US-115-AC5
  test("baseline is retired: it exits 2 naming HELIX's backfill and writes nothing; the baseline activity asks to go through what backfill drafted", () => {
    const app = tempApp({ state: emptyState({ startedFrom: "existing" }) });
    const r = cli(app, ["baseline"]);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /baseline is retired \(ADR-042\): for an existing app, HELIX's backfill drafts the PRD and stories from the app, as proposals/);
    assert.equal(existsSync(join(app, "docs/ux-builder/baseline.md")), false);
    assert.ok(!existsSync(new URL("../artifacts/baseline", import.meta.url)), "no baseline document type");
  });
});
