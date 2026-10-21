/* The starter gets HELIX: the latest release, verified and installed, or the
   bundled copy, a pinned one, or none (FEAT-010 HLF, HLI, HLS; US-067,
   US-068; STP-067, STP-068). No test touches GitHub: a local server answers
   GitHub's release API with packages built from HELIX v0.18.0's files.

     npm test --workspace @ux-builder/create-app */

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { connect } from "node:net";
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

/* A forward proxy (absolute-form HTTP and CONNECT) that records what it carried. */
async function proxyServer() {
  const seen = [];
  const server = createServer(async (req, res) => {
    seen.push({ method: req.method, url: req.url });
    const r = await fetch(new URL(req.url), { headers: req.headers.authorization ? { authorization: req.headers.authorization } : {} });
    res.writeHead(r.status, { "content-type": r.headers.get("content-type") ?? "application/octet-stream" });
    res.end(Buffer.from(await r.arrayBuffer()));
  });
  server.on("connect", (req, client, head) => {
    seen.push({ method: "CONNECT", url: req.url });
    const [host, port] = req.url.split(":");
    const up = connect(Number(port), host, () => { client.write("HTTP/1.1 200 Connection Established\r\n\r\n"); up.write(head); up.pipe(client); client.pipe(up); });
    up.on("error", () => client.destroy());
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const s = { url: `http://127.0.0.1:${server.address().port}`, seen, close: () => new Promise((r) => { server.closeAllConnections?.(); server.close(r); }) };
  servers.push(s);
  return s;
}

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
    const { fetchRelease, TIMEOUT } = await import("../helix.mjs");
    assert.equal(TIMEOUT, 20_000, "the default limit is 20 seconds");
    const slow = await serve({ "v9.9.0": { gz: packHelix({ version: "9.9.0" }) } }, { delayMs: 400 });
    await assert.rejects(fetchRelease({ api: slow.api, timeoutMs: 100 }), (e) => e.name === "TimeoutError");
  });

  // @covers US-067-AC4
  test("AC4: a package with a path out of helix/, an absolute path, a link or a device is refused whole, and falls back", async () => {
    const manifest = { "helix/.claude-plugin/plugin.json": JSON.stringify({ version: "9.9.0" }) };
    const unsafe = [
      [{ ...manifest, "helix/../../evil.sh": "rm -rf ~" }, /unsafe path in the package: helix\/\.\.\/\.\.\/evil\.sh/],
      [{ ...manifest, [join(tmp, "abs-evil.sh")]: "rm -rf ~" }, /unsafe path in the package: \//],
      [{ ...manifest, "helix/skills/helix/SKILL.md": { type: "2", link: "/etc/passwd" } }, /symbolic link: helix\/skills\/helix\/SKILL\.md/],
      [{ ...manifest, "helix/skills/helix/SKILL.md": { type: "1", link: "helix/.claude-plugin/plugin.json" } }, /hard link: helix\/skills\/helix\/SKILL\.md/],
      [{ ...manifest, "helix/skills/helix/dev": { type: "3" } }, /device: helix\/skills\/helix\/dev/],
    ];
    for (const [entries, reason] of unsafe) {
      const s = await serve({ "v9.9.0": { gz: tar(entries) } });
      const r = await create(s.api);
      assert.equal(r.code, 0, r.out);
      assert.equal(r.version().bundled, true);
      assert.match(r.version().reason, reason);
      assert.ok(!existsSync(join(tmp, "evil.sh")) && !existsSync(join(r.dir, "..", "evil.sh")) && !existsSync(join(tmp, "abs-evil.sh")), "nothing written outside the app");
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

  // @covers US-067-AC6
  test("AC6: with a proxy variable set, the API call and the download go through the proxy, unless NO_PROXY names the host", async () => {
    const s = await serve({ "v9.9.0": { gz: packHelix({ version: "9.9.0" }) } });
    const host = new URL(s.api).host;
    const clear = { HTTP_PROXY: undefined, http_proxy: undefined, HTTPS_PROXY: undefined, https_proxy: undefined, NO_PROXY: undefined, no_proxy: undefined }; // spawn leaves out undefined; undici reads an empty lower-case one first
    for (const name of ["HTTP_PROXY", "http_proxy"]) {
      const proxy = await proxyServer();
      const r = await create(s.api, [], { ...clear, [name]: proxy.url });
      assert.equal(r.code, 0, r.out);
      assert.equal(r.version().bundled, false, `${name}: the release was fetched (${r.out})`);
      const carried = proxy.seen.map((x) => x.url).join(" ");
      assert.ok(carried.includes(host), `${name}: the requests went through the proxy: ${JSON.stringify(proxy.seen)}`);
      assert.ok(proxy.seen.length >= 1 && (proxy.seen.some((x) => x.method === "CONNECT") || proxy.seen.length === 2), `${name}: both requests carried: ${JSON.stringify(proxy.seen)}`);
    }
    const bypassed = await proxyServer();
    const r = await create(s.api, [], { ...clear, HTTP_PROXY: bypassed.url, NO_PROXY: "127.0.0.1" });
    assert.equal(r.code, 0, r.out);
    assert.equal(r.version().bundled, false, r.out);
    assert.deepEqual(bypassed.seen, [], "NO_PROXY names the host: nothing goes through the proxy");
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

  // @covers US-068-AC1
  test("AC1 (FEAT-010 size NFR): the bundled HELIX is under 1.5 MB", (t) => {
    const dir = fileURLToPath(new URL("../helix", import.meta.url));
    if (!existsSync(join(dir, "bundled.json"))) { t.skip("no bundled HELIX in helix/ (npm pack or npm run bundle-helix writes it)"); return; }
    const bytes = readdirSync(dir).reduce((n, f) => n + statSync(join(dir, f)).size, 0);
    assert.ok(bytes < 1.5 * 1024 * 1024, `the bundled HELIX is ${bytes} bytes`);
  });

  // @covers US-068-AC4
  test("AC4: --no-helix writes no marker, documents, skill or manifest; the e2e test stays, citing nothing", async () => {
    const r = await create("http://127.0.0.1:9", ["--no-helix"]);
    assert.equal(r.code, 0, r.out);
    for (const f of [".helix.yml", "docs", ".claude/skills/helix", "ux-assessment.yml"]) assert.equal(existsSync(join(r.dir, f)), false, f);
    for (const f of ["package.json", "src/App.jsx", "app.blueprint.json", "AGENTS.md"]) assert.ok(existsSync(join(r.dir, f)), f);
    const spec = readFileSync(join(r.dir, "e2e/starter.spec.js"), "utf8");
    assert.doesNotMatch(spec, /@covers|US-001|docs\/helix/, "there is no US-001 to cite");
    assert.equal((spec.match(/^test\(/gm) ?? []).length, 4, "the four tests are kept");
    const scripts = JSON.parse(readFileSync(join(r.dir, "package.json"), "utf8")).scripts;
    assert.equal(scripts["test:e2e"], "playwright test");
    assert.equal(scripts["assess:validate"], undefined);
  });

  // @covers US-068-AC5
  test("AC5: when the bundled HELIX is missing or bad too, the app is created without HELIX and says why", async () => {
    const empty = mkdtempSync(join(tmpdir(), "helix-no-bundle-"));
    const corrupt = bundle("8.8.0");
    writeFileSync(join(corrupt, "helix-plugin-package-v8.8.0.tar.gz"), "not a package");
    try {
      const cases = [
        [[], empty, /the latest release could not be used \(no network.*\), and the bundled copy could not be used \(no HELIX is bundled in /],
        [[], corrupt, /and the bundled copy could not be used \(the bundled HELIX does not match its recorded digest\)/],
        [["--helix-offline"], empty, /--helix-offline, and the bundled copy could not be used \(no HELIX is bundled in /],
      ];
      for (const [args, dir, reason] of cases) {
        const r = await create("http://127.0.0.1:9", args, { UX_BUILDER_HELIX_BUNDLE: dir });
        assert.equal(r.code, 0, r.out);
        assert.match(r.out, reason);
        assert.match(r.out, /The app was created without HELIX .*no HELIX-VERSION\.json was written/);
        for (const f of [".helix.yml", "docs", ".claude/skills/helix", "ux-assessment.yml"]) assert.equal(existsSync(join(r.dir, f)), false, f);
        assert.doesNotMatch(readFileSync(join(r.dir, "e2e/starter.spec.js"), "utf8"), /@covers/);
      }
    } finally { rmSync(empty, { recursive: true, force: true }); rmSync(corrupt, { recursive: true, force: true }); }
  });

  // @covers US-068-AC6
  test("AC6: --helix-offline with --helix-version is refused: exit 1, no request, nothing written", async () => {
    const s = await serve({ "v9.9.0": { gz: packHelix({ version: "9.9.0" }) } });
    const r = await create(s.api, ["--helix-offline", "--helix-version", "v9.9.0"]);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /--helix-offline and --helix-version cannot be combined/);
    assert.equal(s.seen.requests, 0);
    assert.equal(existsSync(r.dir), false, "no directory");
  });
});
