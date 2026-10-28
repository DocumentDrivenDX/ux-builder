/* The package's generated and pinned parts are current (CONTRACT-009 Input, ADR-042), and the
   stories cover every form (US-166). */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { SUPPORTED } from "../index.mjs";
import { HERE, PER_FORM, fixtures } from "./helpers.mjs";

const sha256 = (text) => createHash("sha256").update(text).digest("hex");

test("@covers US-163-AC3 the pinned umf schema and fixtures match the digests they were pinned with", () => {
  const pinned = JSON.parse(readFileSync(join(HERE, "schema/PINNED.json"), "utf8"));
  assert.equal(sha256(readFileSync(join(HERE, "schema/umf-visual.schema.json"), "utf8")), pinned.schema.sha256, "schema/umf-visual.schema.json was edited by hand; run scripts/pin-umf.mjs");
  for (const [path, digest] of Object.entries(pinned.fixtures)) {
    const local = join(HERE, "test/fixtures/umf", path.replace("fixtures/visual/", ""));
    assert.equal(sha256(readFileSync(local, "utf8")), digest, path);
  }
  assert.equal(fixtures.length + 1, Object.keys(pinned.fixtures).length, "every pinned fixture, plus the inventory index");
});

test("@covers US-163-AC1 font tables and types are generated from the current fonts and schema", () => {
  for (const script of ["scripts/build-metrics.mjs", "scripts/build-types.mjs"]) execFileSync(process.execPath, [join(HERE, script), "--check"], { stdio: "pipe" });
  const metrics = JSON.parse(readFileSync(join(HERE, "metrics/fonts.json"), "utf8"));
  for (const family of ["DM Sans", "IBM Plex Sans", "Roboto", "Quicksand"]) assert.ok(metrics.families[family], family);
});

test("@covers US-166-AC1 there is one story per supported kind and form, each drawn from a pinned fixture", () => {
  const source = readFileSync(join(HERE, "stories/visuals.stories.jsx"), "utf8");
  const table = Object.fromEntries([...source.matchAll(/^\s+"([a-z]+\/[a-z-]+)": "([\w-]+)",$/gm)].map((m) => [m[1], m[2]]));
  assert.deepEqual(Object.keys(table).sort(), [...SUPPORTED].sort());
  assert.deepEqual(table, PER_FORM);
  for (const [form, id] of Object.entries(table)) {
    assert.ok(fixtures.some((f) => f.id === id), id);
    const name = form.split("/").map((p) => p.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase())).join("");
    assert.match(source, new RegExp(`export const ${name} = story\\("${form}"\\);`), form);
  }
  assert.match(source, /excludeStories: \["STORY_FIXTURES"\]/);
});
