#!/usr/bin/env node
/* Copy the umf.visual payload schema and its example documents from an umf-visual checkout at
   one commit, and record where they came from (CONTRACT-009 Input). Run again to move the pin.

     node scripts/pin-umf-visual.mjs <umf-visual checkout> <commit> */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
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

const schemaPath = "spec/extensions/visual/schema.json";
const schema = git("show", `${full}:${schemaPath}`);
writeFileSync(join(here, "schema/umf-visual.schema.json"), schema);

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
  repository, commit: full, vocabulary: "umf.visual", version: "1.0.0",
  schema: { path: schemaPath, sha256: sha256(schema) }, fixtures: copied,
}, null, 2) + "\n");
console.log(`pinned ${repository.split("/").at(-1)} ${full.slice(0, 8)}: schema and ${files.length} fixtures`);
