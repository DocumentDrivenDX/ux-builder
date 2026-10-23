/* The package itself (US-114-AC6, ADR-036 rules 1 and 3): what it depends
   on, and that it ships its notices.

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const PKG = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const at = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));

describe("@ux-builder/design's package", () => {
  // @covers US-114-AC6
  test("depends on @ux-builder/ui, @ux-builder/audit and @ux-builder/trace, plus ajv, a library that makes no network call", () => {
    assert.deepEqual(Object.keys(PKG.dependencies).sort(), ["@ux-builder/audit", "@ux-builder/trace", "@ux-builder/ui", "ajv"]);
    assert.equal(PKG.private, undefined);
    assert.equal(PKG.publishConfig.access, "public");
    // npm run licences checks this file against the installed tree (US-049); it must exist and be shipped.
    assert.ok(existsSync(at("THIRD-PARTY-NOTICES.md")));
    assert.ok(PKG.files.includes("THIRD-PARTY-NOTICES.md"));
  });

  test("ships the CLI, the schema and the skill", () => {
    assert.equal(PKG.bin["ux-builder-design"], "./cli.mjs");
    for (const f of ["cli.mjs", "index.mjs", "init.mjs", "schema", "skill"]) assert.ok(PKG.files.includes(f), f);
  });
});
