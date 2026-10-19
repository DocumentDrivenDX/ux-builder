/* The third-party licence check (US-049, ADR-023 rule 7): small fixture
   repositories with installed packages, and the real repository. */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { classify, evaluate, scan } from "../../check-licences.mjs";

const ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const CLI = join(ROOT, "tools/check-licences.mjs");
const MIT = "MIT License\n\nCopyright (c) 2024 Someone\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software...";
const APACHE = "                                 Apache License\n                           Version 2.0, January 2004\n";
const GPL = "                    GNU GENERAL PUBLIC LICENSE\n                       Version 3, 29 June 2007\n";
const made = [];
after(() => { for (const d of made) rmSync(d, { recursive: true, force: true }); });

const put = (root, path, content) => { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), typeof content === "string" ? content : JSON.stringify(content, null, 2)); };

/* A repository with one published package depending on the given installed packages. */
function repo({ own = {}, deps = [], exceptions, vendored, files } = {}) {
  const root = mkdtempSync(join(tmpdir(), "licences-"));
  made.push(root);
  put(root, "packages/sdk/package.json", { name: "@ux-builder/sdk", version: "1.0.0", license: "UNLICENSED", files: files ?? ["dist", "licenses", "THIRD-PARTY-NOTICES.md"], dependencies: Object.fromEntries(deps.filter((d) => !d.nested).map((d) => [d.name, "*"])), ...own });
  for (const d of deps) {
    const at = d.nested ? `node_modules/${d.nested}/node_modules/${d.name}` : `node_modules/${d.name}`;
    put(root, `${at}/package.json`, { name: d.name, version: d.version ?? "1.0.0", ...(d.license !== undefined && { license: d.license }), ...(d.dependencies && { dependencies: d.dependencies }), ...(d.scripts && { scripts: d.scripts }) });
    if (d.file) put(root, `${at}/LICENSE`, d.file);
  }
  if (exceptions) put(root, "licenses/exceptions.json", { exceptions });
  if (vendored) for (const [path, content] of Object.entries(vendored)) put(root, `packages/sdk/${path}`, content);
  return root;
}
const run = (root) => {
  try { return { code: 0, out: execFileSync("node", [CLI], { env: { ...process.env, LICENCE_ROOT: root }, encoding: "utf8", stdio: "pipe" }) }; }
  catch (e) { return { code: e.status, out: `${e.stdout}${e.stderr}` }; }
};

test("SPDX expressions: OR passes on one allowed choice, AND needs every part, WITH keeps its base", () => {
  assert.deepEqual(evaluate("(MIT OR GPL-3.0)").choice, ["MIT"]);
  assert.equal(evaluate("MIT AND GPL-3.0").choice, null);
  assert.deepEqual(evaluate("Apache-2.0 WITH LLVM-exception").choice, ["Apache-2.0"]);
  assert.equal(evaluate("SEE LICENSE IN LICENSE.md").choice, null);
  assert.equal(classify(MIT), "MIT");
  assert.equal(classify(APACHE), "Apache-2.0");
  assert.equal(classify(GPL), "GPL");
});

// @covers US-049-AC1
test("US-049-AC1: every published SDK package's production, peer and optional trees, and its vendored record, are read", () => {
  const { packages } = scan(ROOT);
  const names = packages.map((p) => p.name).sort();
  assert.deepEqual(names, ["@ux-builder/audit", "@ux-builder/create-app", "@ux-builder/mcp", "@ux-builder/tokens", "@ux-builder/ui"], "the private engine is not published, so it is not checked");
  const ui = packages.find((p) => p.name === "@ux-builder/ui");
  assert.ok(ui.third.some((t) => t.name === "react"), "peer dependencies are read");
  assert.ok(ui.third.some((t) => t.name === "eslint"), "the lint peers and their trees are read");
  assert.equal(ui.vendored.length, 4, "the four bundled icon sets are recorded");
  const audit = packages.find((p) => p.name === "@ux-builder/audit");
  assert.ok(audit.third.some((t) => t.name === "axe-core"), "production dependencies are read");
  // A dependency of a dependency, installed where that dependency is.
  const root = repo({ deps: [{ name: "a", license: "MIT", dependencies: { b: "*" } }, { name: "b", nested: "a", license: "GPL-3.0" }] });
  assert.match(scan(root).errors.join("\n"), /b@1\.0\.0 is licensed GPL-3\.0/);
});

// @covers US-049-AC2
test("US-049-AC2: a licence off the allow-list, unknown, missing or SEE LICENSE IN fails, naming package, version and licence; counsel's exception passes", () => {
  const root = repo({ deps: [
    { name: "ok-mit", license: "MIT", file: MIT },
    { name: "dual", license: "(MIT OR GPL-3.0)" },
    { name: "copyleft", version: "2.1.0", license: "GPL-3.0" },
    { name: "none" },
    { name: "proprietary", license: "SEE LICENSE IN LICENSE" },
    { name: "odd", license: "WTFPL" },
  ] });
  const r = run(root);
  assert.equal(r.code, 1);
  assert.match(r.out, /copyleft@2\.1\.0 is licensed GPL-3\.0, which is not on the allow-list/);
  assert.match(r.out, /none@1\.0\.0 declares no licence/);
  assert.match(r.out, /proprietary@1\.0\.0 is licensed SEE LICENSE IN LICENSE/);
  assert.match(r.out, /odd@1\.0\.0 is licensed WTFPL/);
  assert.doesNotMatch(r.out, /fail .*(ok-mit|dual)@/, "MIT, and a dual licence with an allowed choice, pass");

  const approved = repo({ deps: [{ name: "copyleft", license: "GPL-3.0" }], exceptions: [{ name: "copyleft", licence: "GPL-3.0", reason: "x", approvedBy: "Counsel", approved: "2026-10-19", reviewBy: "2099-01-01" }] });
  assert.deepEqual(scan(approved).errors, []);
  const pending = repo({ deps: [{ name: "copyleft", license: "GPL-3.0" }], exceptions: [{ name: "copyleft", licence: "GPL-3.0", reason: "x", reviewBy: "2026-11-18" }] });
  assert.deepEqual(scan(pending, { now: new Date("2026-10-19") }).errors, [], "awaiting counsel: a warning until the review date");
  assert.match(scan(pending, { now: new Date("2026-10-19") }).warnings.join("\n"), /awaiting counsel until 2026-11-18/);
  assert.match(scan(pending, { now: new Date("2026-11-19") }).errors.join("\n"), /review date 2026-11-18 has passed without counsel's approval/);
});

// @covers US-049-AC3
test("US-049-AC3: vendored source that lost its notice, a changed file not marked, or a licence text not shipped fails", () => {
  const record = (over = {}) => ({ vendored: [{ name: "ai-elements message", source: "https://github.com/vercel/ai-elements", version: "1.9.1", licence: "Apache-2.0", licenceFile: "licenses/ai-elements.LICENSE", files: ["src/message.jsx"], notice: "Copyright 2023 Vercel, Inc.", changed: ["src/message.jsx"], ...over }] });
  const good = repo({ vendored: { "licenses/vendored.json": record(), "licenses/ai-elements.LICENSE": APACHE, "src/message.jsx": "/* Copyright 2023 Vercel, Inc. Licensed under Apache-2.0. Changed by the UX Builder authors: themed. */" } });
  assert.deepEqual(scan(good).errors, []);
  const lost = repo({ vendored: { "licenses/vendored.json": record(), "licenses/ai-elements.LICENSE": APACHE, "src/message.jsx": "/* Changed by the UX Builder authors */" } });
  assert.match(scan(lost).errors.join("\n"), /src\/message\.jsx has lost its notice/);
  const unmarked = repo({ vendored: { "licenses/vendored.json": record(), "licenses/ai-elements.LICENSE": APACHE, "src/message.jsx": "/* Copyright 2023 Vercel, Inc. */" } });
  assert.match(scan(unmarked).errors.join("\n"), /src\/message\.jsx is changed but does not say so/);
  const noText = repo({ vendored: { "licenses/vendored.json": record(), "src/message.jsx": "/* Copyright 2023 Vercel, Inc. Changed by the UX Builder authors */" } });
  assert.match(scan(noText).errors.join("\n"), /its licence text licenses\/ai-elements\.LICENSE is not in the package/);
  const noNotice = repo({ vendored: { "licenses/vendored.json": record({ noticeFile: "licenses/ai-elements.NOTICE" }), "licenses/ai-elements.LICENSE": APACHE, "src/message.jsx": "/* Copyright 2023 Vercel, Inc. Changed by the UX Builder authors */" } });
  assert.match(scan(noNotice).errors.join("\n"), /its NOTICE file licenses\/ai-elements\.NOTICE is not in the package/);
  const notShipped = repo({ files: ["dist", "THIRD-PARTY-NOTICES.md"], vendored: { "licenses/vendored.json": record(), "licenses/ai-elements.LICENSE": APACHE, "src/message.jsx": "/* Copyright 2023 Vercel, Inc. Changed by the UX Builder authors */" } });
  assert.match(scan(notShipped).errors.join("\n"), /licenses\/ai-elements\.LICENSE is not in package\.json "files"/);
});

// @covers US-049-AC4
test("US-049-AC4: an SDK package without its own licence fails; each ships THIRD-PARTY-NOTICES.md listing every package and vendored source", () => {
  const unlicensed = repo({ own: { license: undefined }, deps: [{ name: "ok-mit", license: "MIT" }] });
  assert.match(scan(unlicensed).errors.join("\n"), /@ux-builder\/sdk \(packages\/sdk\) declares no licence of its own/);
  const root = repo({ deps: [{ name: "ok-mit", version: "3.2.1", license: "MIT", file: MIT }] });
  const first = run(root);
  assert.equal(first.code, 1);
  assert.match(first.out, /THIRD-PARTY-NOTICES\.md is missing/);
  execFileSync("node", [CLI, "--write"], { env: { ...process.env, LICENCE_ROOT: root } });
  assert.equal(run(root).code, 0, "up to date once written");
  const notices = scan(root).packages[0].notices;
  assert.match(notices, /\| ok-mit \| 3\.2\.1 \| MIT \|/);
  const noFile = repo({ files: ["dist"], deps: [] });
  assert.match(scan(noFile).errors.join("\n"), /THIRD-PARTY-NOTICES\.md is not in package\.json "files"/);
  // The real repository: every published package declares a licence and its notices are current.
  assert.equal(run(ROOT).code, 0, run(ROOT).out);
  const ui = scan(ROOT).packages.find((p) => p.name === "@ux-builder/ui");
  assert.match(ui.notices, /lucide-static glyphs .* \| 1\.52\.0 \| ISC \| licenses\/lucide\.LICENSE/);
});

// @covers US-049-AC5
test("US-049-AC5: a shipped telemetry package, or a dependency with an install script, fails, naming it", () => {
  const root = repo({ deps: [
    { name: "@scarf/scarf", license: "Apache-2.0" },
    { name: "phones-home", license: "MIT", scripts: { postinstall: "node report.js" } },
    { name: "native", license: "MIT", scripts: { install: "node-gyp rebuild" } },
  ], exceptions: [{ name: "native", licence: "MIT", reason: "Builds a native module; reviewed: no network.", installScript: true }] });
  const errors = scan(root).errors.join("\n");
  assert.match(errors, /@scarf\/scarf@1\.0\.0 is Scarf install analytics, which reports usage/);
  assert.match(errors, /phones-home@1\.0\.0 runs an install script \(postinstall: node report\.js\)/);
  assert.doesNotMatch(errors, /native@/, "an install script an exception has reviewed passes");
  assert.doesNotMatch(scan(ROOT).errors.join("\n"), /telemetry|install script/, "the SDK ships neither today");

  // A telemetry package in the development tree (as @carbon/icons brings @ibm/telemetry-js): every CI workflow must switch it off.
  const dev = repo({ deps: [] });
  put(dev, "node_modules/@ibm/telemetry-js/package.json", { name: "@ibm/telemetry-js", version: "1.11.0", license: "Apache-2.0" });
  put(dev, ".github/workflows/ci.yml", "name: ci\non: push\njobs:\n  check:\n    runs-on: ubuntu-latest\n");
  put(dev, ".github/workflows/release.yml", 'name: release\non: push\nenv:\n  IBM_TELEMETRY_DISABLED: "true"\njobs:\n  release:\n    runs-on: ubuntu-latest\n');
  const devErrors = scan(dev).errors.join("\n");
  assert.match(devErrors, /node_modules\/@ibm\/telemetry-js is IBM install telemetry .*; \.github\/workflows\/ci\.yml must set IBM_TELEMETRY_DISABLED: "true"/);
  assert.doesNotMatch(devErrors, /release\.yml/, "a workflow that switches it off passes");
});

// @covers US-049-AC6
test("US-049-AC6: a package whose licence field and LICENSE file disagree fails, naming both", () => {
  const root = repo({ deps: [{ name: "mismatch", license: "MIT", file: GPL }, { name: "agrees", license: "Apache-2.0", file: APACHE }] });
  const errors = scan(root).errors.join("\n");
  assert.match(errors, /mismatch@1\.0\.0 declares MIT but its LICENSE reads as GPL/);
  assert.doesNotMatch(errors, /agrees@/);
});
