#!/usr/bin/env node
/* Copy each umf.visual payload schema and the example documents from an umf-visual checkout at
   one commit, and record where they came from (CONTRACT-009 Input). Run again to move the pin.
   umf-visual keeps each frozen version under spec/extensions/visual/<version>/ and the latest at
   spec/extensions/visual/schema.json; a schema's `$id` (urn:umf:visual:<version>) names it.

     node scripts/pin-umf-visual.mjs <umf-visual checkout> <commit> */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const [repo, commit] = process.argv.slice(2);
if (!repo || !commit) throw new Error("usage: pin-umf-visual.mjs <umf-visual checkout> <commit>");
const here = join(dirname(fileURLToPath(import.meta.url)), "..");
const git = (...args) => execFileSync("git", ["-C", repo, ...args], { encoding: "utf8", maxBuffer: 1 << 26 });
const full = git("rev-parse", commit).trim();
// The checkout's origin as an https URL, so the record names the repository the commit is in.
const repository = git("remote", "get-url", "origin").trim().replace(/^git@github\.com:/, "https://github.com/").replace(/\.git$/, "");
const sha256 = (text) => createHash("sha256").update(text).digest("hex");

// Every version's schema, named by its $id, as schema/umf-visual-<version>.schema.json.
for (const old of readdirSync(join(here, "schema")).filter((f) => f.endsWith(".schema.json"))) rmSync(join(here, "schema", old));
const schemas = {};
for (const path of git("ls-tree", "-r", "--name-only", full, "spec/extensions/visual").split("\n").filter((f) => /(^|\/)schema\.json$/.test(f))) {
  const text = git("show", `${full}:${path}`);
  const version = /^urn:umf:visual:(\d+\.\d+\.\d+)$/.exec(JSON.parse(text).$id ?? "")?.[1];
  if (!version) throw new Error(`${path} has no urn:umf:visual:<version> $id`);
  if (schemas[version]) throw new Error(`two schemas declare umf.visual ${version}`);
  writeFileSync(join(here, `schema/umf-visual-${version}.schema.json`), text);
  schemas[version] = { path, sha256: sha256(text) };
}
const versions = Object.keys(schemas).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

const fixtures = join(here, "test/fixtures/umf");
rmSync(fixtures, { recursive: true, force: true });
const files = git("ls-tree", "-r", "--name-only", full, "fixtures/visual").split("\n").filter((f) => f.endsWith(".json"));
const copied = {};
for (const file of files) {
  const text = git("show", `${full}:${file}`);
  const target = join(fixtures, file.replace("fixtures/visual/", ""));
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, text);
  copied[file] = sha256(text);
}
writeFileSync(join(here, "schema/PINNED.json"), JSON.stringify({
  repository, commit: full, vocabulary: "umf.visual", versions, schemas, fixtures: copied,
}, null, 2) + "\n");
console.log(`pinned ${repository.split("/").at(-1)} ${full.slice(0, 8)}: umf.visual ${versions.join(", ")} and ${files.length} fixtures`);
