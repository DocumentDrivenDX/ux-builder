/* The starter gets HELIX: the latest release, verified and installed, or the
   bundled copy, a pinned one, or none (FEAT-010 HLF, HLI, HLS; US-067,
   US-068; STP-067, STP-068). No test touches GitHub: a local server answers
   GitHub's release API with packages built from HELIX v0.18.0's files.

     npm test --workspace @ux-builder/create-app */

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { bundle, packHelix, releaseServer, sha, tar } from "./fixtures/helix-release.mjs";

const CLI = fileURLToPath(new URL("../index.mjs", import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), "helix-fetch-"));
const BUNDLE = bundle("8.8.0");
const servers = [];
after(async () => { for (const s of servers) await s.close(); rmSync(tmp, { recursive: true, force: true }); rmSync(BUNDLE, { recursive: true, force: true }); });

let n = 0;
/* Run the starter against a release server (or none), with the test bundle. */
function create(api, args = [], env = {}) {
  const dir = join(tmp, `app-${++n}`);
  return new Promise((resolve) => {
    const c = spawn(process.execPath, [CLI, dir, ...args], { cwd: tmp, env: { ...process.env, GITHUB_TOKEN: "", UX_BUILDER_HELIX_API: api ?? "http://127.0.0.1:9", UX_BUILDER_HELIX_BUNDLE: BUNDLE, ...env } });
    let out = "";
    c.stdout.on("data", (d) => { out += d; }); c.stderr.on("data", (d) => { out += d; });
    c.on("close", (code) => resolve({ code, out, dir, version: () => JSON.parse(readFileSync(join(dir, ".claude/skills/helix/HELIX-VERSION.json"), "utf8")) }));
  });
}
const serve = async (releases, o) => { const s = await releaseServer(releases, o); servers.push(s); return s; };

describe("US-067: create an app on the latest HELIX", () => {
  let latest;
  before(async () => { latest = await serve({ "v9.9.0": { gz: packHelix({ version: "9.9.0" }) }, "v9.8.0": { gz: packHelix({ version: "9.8.0" }) } }); });

  // @covers US-067-AC1
  test("AC1: the latest release's skill and catalogue are installed as the app's project skill, as they are in the package", async () => {
    const r = await create(latest.api);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /HELIX v9\.9\.0 \(latest release, verified\)/);
    const skill = join(r.dir, ".claude/skills/helix");
    assert.ok(existsSync(join(skill, "SKILL.md")));
    assert.ok(existsSync(join(skill, "references/graph.yml")));
    const pkg = join(fileURLToPath(new URL("fixtures/helix-package/helix/skills/helix", import.meta.url)));
    for (const f of ["references/graph.yml", "references/activities/01-frame/artifacts/prd/template.md", "references/concerns/react-vite/concern.md"]) assert.deepEqual(readFileSync(join(skill, f)), readFileSync(join(pkg, f)), f);
    assert.ok(!existsSync(join(r.dir, ".claude/skills/helix/.claude-plugin")), "only skills/helix/ is installed");
  });

  // @covers US-067-AC2
  test("AC2: a package with the wrong digest, the wrong version or without the skill or catalogue is refused for the bundled copy", async () => {
    const bad = {
      digest: { gz: packHelix({ version: "9.9.0" }), digest: "sha256:" + "0".repeat(64) },
      version: { gz: packHelix({ version: "1.0.0" }) },
      skill: { gz: packHelix({ version: "9.9.0", files: { "helix/skills/helix/SKILL.md": null } }) },
      catalogue: { gz: packHelix({ version: "9.9.0", files: { "helix/skills/helix/references/graph.yml": null } }) },
    };
    for (const [what, rel] of Object.entries(bad)) {
      const s = await serve({ "v9.9.0": rel });
      const r = await create(s.api);
      assert.equal(r.code, 0, r.out);
      assert.match(r.out, /using the bundled copy/, what);
      const v = r.version();
      assert.equal(v.bundled, true, what);
      assert.equal(v.tag, "v8.8.0", what);
      assert.match(v.reason, { digest: /SHA-256/, version: /says version 1\.0\.0, not v9\.9\.0/, skill: /no helix\/skills\/helix\/SKILL\.md/, catalogue: /no helix\/skills\/helix\/references\/graph\.yml/ }[what], what);
    }
  });

  // @covers US-067-AC3
  test("AC3: GITHUB_TOKEN goes to GitHub's API as a bearer token and nowhere else; a silent server is unreachable after 20 s", async () => {
    const s = await serve({ "v9.9.0": { gz: packHelix({ version: "9.9.0" }) } });
    const r = await create(s.api, [], { GITHUB_TOKEN: "test-token-123" });
    assert.equal(r.code, 0, r.out);
    assert.deepEqual(s.seen.auth, ["Bearer test-token-123", null], "the API call carries it; the asset download does not");
    const written = readdirSync(r.dir, { recursive: true }).filter((f) => !f.includes("node_modules")).map((f) => join(r.dir, f)).filter((f) => { try { return readFileSync(f, "utf8").includes("test-token-123"); } catch { return false; } });
    assert.deepEqual(written, [], "the token is written nowhere");
    const anon = await serve({ "v9.9.0": { gz: packHelix({ version: "9.9.0" }) } });
    await create(anon.api);
    assert.deepEqual(anon.seen.auth, [null, null]);
    const { fetchRelease } = await import("../helix.mjs");
    const slow = await serve({ "v9.9.0": { gz: packHelix({ version: "9.9.0" }) } }, { delayMs: 400 });
    await assert.rejects(fetchRelease({ api: slow.api, timeoutMs: 100 }), (e) => e.name === "TimeoutError");
  });

  // @covers US-067-AC4
  test("AC4: a package with a path out of helix/, a link or a device is refused whole, and falls back", async () => {
    const unsafe = [
      { "helix/.claude-plugin/plugin.json": JSON.stringify({ version: "9.9.0" }), "helix/../../evil.sh": "rm -rf ~" },
      { "helix/.claude-plugin/plugin.json": JSON.stringify({ version: "9.9.0" }), "helix/skills/helix/SKILL.md": { type: "2", link: "/etc/passwd" } },
      { "helix/.claude-plugin/plugin.json": JSON.stringify({ version: "9.9.0" }), "helix/skills/helix/dev": { type: "3" } },
    ];
    for (const entries of unsafe) {
      const s = await serve({ "v9.9.0": { gz: tar(entries) } });
      const r = await create(s.api);
      assert.equal(r.code, 0, r.out);
      assert.equal(r.version().bundled, true);
      assert.match(r.version().reason, /unsafe path|symbolic link|device/);
      assert.ok(!existsSync(join(tmp, "evil.sh")) && !existsSync(join(r.dir, "..", "evil.sh")));
    }
  });

  // @covers US-067-AC5
  test("AC5: the app records the version, tag, source, digest, time and whether it is the bundled copy", async () => {
    const gz = packHelix({ version: "9.9.0" });
    const s = await serve({ "v9.9.0": { gz } });
    const r = await create(s.api);
    const v = r.version();
    assert.deepEqual([v.version, v.tag, v.digest, v.bundled], ["9.9.0", "v9.9.0", sha(gz), false]);
    assert.equal(v.source, `${s.api}/download/v9.9.0/helix-plugin-package-v9.9.0.tar.gz`);
    assert.ok(Date.parse(v.fetchedAt));
    const marker = readFileSync(join(r.dir, ".helix.yml"), "utf8");
    assert.match(marker, /^flows:\n {2}- id: helix\n {4}root: docs\/helix\/\n {4}version: "9\.9\.0"$/m);
  });
});

describe("US-068: create an app offline or on a pinned HELIX", () => {
  // @covers US-068-AC1
  test("AC1: without the network, the bundled HELIX, with the version and the reason", async () => {
    const r = await create("http://127.0.0.1:9");
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /HELIX v8\.8\.0 \(bundled with this starter: no network/);
    assert.deepEqual([r.version().tag, r.version().bundled], ["v8.8.0", true]);
    assert.match(r.version().reason, /no network/);
  });

  // @covers US-068-AC2
  test("AC2: --helix-offline makes no request", async () => {
    const s = await serve({ "v9.9.0": { gz: packHelix({ version: "9.9.0" }) } });
    const r = await create(s.api, ["--helix-offline"]);
    assert.equal(r.code, 0, r.out);
    assert.equal(s.seen.requests, 0);
    assert.deepEqual([r.version().tag, r.version().reason], ["v8.8.0", "--helix-offline"]);
  });

  // @covers US-068-AC3
  test("AC3: --helix-version installs that release, or exits 1 and creates nothing", async () => {
    const s = await serve({ "v9.9.0": { gz: packHelix({ version: "9.9.0" }) }, "v9.7.0": { gz: packHelix({ version: "9.7.0" }) } });
    const ok = await create(s.api, ["--helix-version", "v9.7.0"]);
    assert.equal(ok.code, 0, ok.out);
    assert.equal(ok.version().tag, "v9.7.0");
    const missing = await create(s.api, ["--helix-version", "v1.2.3"]);
    assert.equal(missing.code, 1);
    assert.match(missing.out, /HELIX v1\.2\.3 could not be fetched and verified: no such release/);
    assert.equal(existsSync(missing.dir), false, "no directory");
  });

  // @covers US-068-AC4
  test("AC4: --no-helix writes no marker, documents or skill, and the app is as before", async () => {
    const r = await create("http://127.0.0.1:9", ["--no-helix"]);
    assert.equal(r.code, 0, r.out);
    for (const f of [".helix.yml", "docs", ".claude/skills/helix", "ux-assessment.yml"]) assert.equal(existsSync(join(r.dir, f)), false, f);
    for (const f of ["package.json", "src/App.jsx", "app.blueprint.json", "AGENTS.md"]) assert.ok(existsSync(join(r.dir, f)), f);
  });
});
