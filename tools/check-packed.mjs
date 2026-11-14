#!/usr/bin/env node
/* The packed-files check. Tests import each package from its source folder,
   so a module left out of package.json "files" passes every test and still
   breaks the published package (@ux-builder/design 1.1.0 shipped without
   scope.mjs, finish.mjs, batch.mjs and stepproto.mjs, which index.mjs imports).

   For every published package (packages/*, not private) it lists what
   `npm pack` would ship (scripts not run, so nothing is rebuilt or rewritten)
   and fails when:

   - a shipped module statically imports or re-exports a relative path that
     is not shipped (the imports come from Node's own parser, so code written
     inside strings, such as create-app's generated files, is not counted);
   - a "main", "bin" or non-wildcard "exports" target is not shipped.

     node tools/check-packed.mjs   (npm run check runs this) */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, posix } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

if (!vm.SourceTextModule) {
  // dependencySpecifiers needs the vm modules flag; run again with it.
  const r = await import("node:child_process").then(({ spawnSync }) =>
    spawnSync(process.execPath, ["--experimental-vm-modules", "--no-warnings", fileURLToPath(import.meta.url), ...process.argv.slice(2)], { stdio: "inherit" }));
  process.exit(r.status ?? 1);
}

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const MODULE = new Set([".mjs", ".js"]);

/** The paths `npm pack` would put in the package's tarball, relative to its folder. */
export function packedFiles(dir) {
  const out = execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  return new Set(JSON.parse(out.slice(out.indexOf("[")))[0].files.map((f) => f.path));
}

/** The relative specifiers a module imports or re-exports, by Node's parser; null when it is not an ES module. */
export function relativeImports(source) {
  let mod;
  try { mod = new vm.SourceTextModule(source); } catch { return null; }
  return mod.dependencySpecifiers.filter((s) => s.startsWith("./") || s.startsWith("../"));
}

function targets(value) {
  if (typeof value === "string") return [value];
  if (value && typeof value === "object") return Object.values(value).flatMap(targets);
  return [];
}

export function packageFailures(dir) {
  const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  const packed = packedFiles(dir);
  const failures = [];
  for (const file of packed) {
    if (!MODULE.has(extname(file))) continue;
    const imports = relativeImports(readFileSync(join(dir, file), "utf8"));
    for (const spec of imports ?? []) {
      const target = posix.normalize(posix.join(posix.dirname(file), spec));
      if (!packed.has(target)) failures.push(`${pkg.name}: ${file} imports ${spec}, which is not shipped (add ${target} to "files")`);
    }
  }
  const entry = [pkg.main, ...targets(pkg.bin), ...targets(pkg.exports)].filter((t) => t && !t.includes("*"));
  for (const t of entry) {
    const path = posix.normalize(t);
    if (!packed.has(path)) failures.push(`${pkg.name}: entry point ${t} is not shipped`);
  }
  return failures;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dirs = readdirSync(join(ROOT, "packages")).map((d) => join(ROOT, "packages", d))
    .filter((d) => existsSync(join(d, "package.json")) && !JSON.parse(readFileSync(join(d, "package.json"), "utf8")).private);
  const failures = dirs.flatMap(packageFailures);
  if (failures.length) {
    console.error(`Packed files: ${failures.length} problem(s)\n  ${failures.join("\n  ")}`);
    process.exit(1);
  }
  console.log(`Packed files: ${dirs.length} packages ship every module they import.`);
}
