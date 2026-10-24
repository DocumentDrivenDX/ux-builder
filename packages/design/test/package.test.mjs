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
  test("depends on @ux-builder/ui, @ux-builder/audit and @ux-builder/trace, plus ajv and yaml, libraries that make no network call", () => {
    assert.deepEqual(Object.keys(PKG.dependencies).sort(), ["@ux-builder/audit", "@ux-builder/trace", "@ux-builder/ui", "ajv", "yaml"]);
    assert.equal(PKG.private, undefined);
    assert.equal(PKG.publishConfig.access, "public");
    // npm run licences checks this file against the installed tree (US-049); it must exist and be shipped.
    assert.ok(existsSync(at("THIRD-PARTY-NOTICES.md")));
    assert.ok(PKG.files.includes("THIRD-PARTY-NOTICES.md"));
  });

  test("ships the CLI, the schema and the skill", () => {
    assert.equal(PKG.bin["ux-builder-design"], "./cli.mjs");
    for (const f of ["cli.mjs", "index.mjs", "init.mjs", "checkpoints.mjs", "documents.mjs", "schema", "skill", "artifacts"]) assert.ok(PKG.files.includes(f), f);
  });
});

describe("no network, no model (US-116-AC4)", () => {
  // @covers US-116-AC4
  test("nothing in the package imports an HTTP client or a model SDK, and the commands run with networking blocked", async () => {
    const { readdirSync } = await import("node:fs");
    const src = readdirSync(at(".")).filter((f) => f.endsWith(".mjs"));
    assert.ok(src.length >= 8);
    const BANNED = /from\s+["'](node:)?(http|https|http2|net|tls|dgram|undici|axios|node-fetch|got|openai|@anthropic-ai\/[^"']+|@google\/generative-ai|ollama)["']/;
    for (const f of src) {
      const text = readFileSync(at(f), "utf8");
      assert.doesNotMatch(text, BANNED, f);
      assert.doesNotMatch(text, /\bfetch\(|XMLHttpRequest|sendBeacon/, f);
    }
    // Every CLI test runs with node --import test/guard.mjs, which makes any network API throw (helpers.mjs);
    // this run proves the guard is in place for a child process too.
    const { cli, tempApp } = await import("./helpers.mjs");
    const app = tempApp();
    for (const args of [["status"], ["state", "get"], ["brief"], ["validate"]]) assert.equal(cli(app, args).status, 0, args.join(" "));
    const { spawnSync } = await import("node:child_process");
    const probe = spawnSync(process.execPath, ["--import", at("test/guard.mjs"), "-e", "fetch('https://example.com').catch((e) => { console.log(e.message); })"], { encoding: "utf8" });
    assert.match(probe.stdout + probe.stderr, /network use is blocked/);
  });
});
