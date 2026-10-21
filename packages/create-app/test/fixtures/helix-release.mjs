/* A HELIX release for the starter's tests, without the network (STP-067 to
   STP-071). packHelix() builds a plugin package (.tar.gz) from
   fixtures/helix-package/ — HELIX v0.18.0's templates, metadata and
   concerns for the starter set (HELIX's plugin manifest declares MIT) — with
   the version and files a test asks for. releaseServer() answers GitHub's
   release API for them; bundle() writes a bundled copy. */

import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const PKG = fileURLToPath(new URL("helix-package", import.meta.url));

function walk(dir) {
  return readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
}

/* A ustar archive of { path: Buffer | string | { type, link } }. */
export function tar(entries) {
  const blocks = [];
  for (const [path, v] of Object.entries(entries)) {
    const body = typeof v === "string" ? Buffer.from(v) : Buffer.isBuffer(v) ? v : Buffer.alloc(0);
    const meta = typeof v === "object" && !Buffer.isBuffer(v) ? v : {};
    const h = Buffer.alloc(512);
    const name = path.length > 100 ? path.slice(path.lastIndexOf("/", path.length - 100) + 1) : path;
    const prefix = path.length > 100 ? path.slice(0, path.length - name.length - 1) : "";
    h.write(name, 0); h.write("0000644\0", 100); h.write("0000000\0", 108); h.write("0000000\0", 116);
    h.write(body.length.toString(8).padStart(11, "0") + "\0", 124); h.write("00000000000\0", 136);
    h.write(meta.type ?? "0", 156); if (meta.link) h.write(meta.link, 157);
    h.write("ustar\0", 257); h.write("00", 263); h.write(prefix, 345);
    h.write("        ", 148);
    let sum = 0; for (const x of h) sum += x;
    h.write(sum.toString(8).padStart(6, "0") + "\0 ", 148);
    blocks.push(h, body, Buffer.alloc((512 - (body.length % 512)) % 512));
  }
  blocks.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(blocks));
}

/* The fixture package at a version, with files added, changed or removed (null). */
export function packHelix({ version = "9.9.0", files = {} } = {}) {
  const entries = {};
  for (const p of walk(join(PKG, "helix"))) entries[relative(PKG, p).split(sep).join("/")] = readFileSync(p);
  const manifest = JSON.parse(entries["helix/.claude-plugin/plugin.json"].toString());
  entries["helix/.claude-plugin/plugin.json"] = JSON.stringify({ ...manifest, version }, null, 2);
  for (const [p, v] of Object.entries(files)) { if (v === null) delete entries[p]; else entries[p] = v; }
  return tar(entries);
}

export const sha = (b) => "sha256:" + createHash("sha256").update(b).digest("hex");

/* GitHub's release API for these releases: { tag: { gz, digest? } }; latest is the first. */
export async function releaseServer(releases, { delayMs = 0 } = {}) {
  const seen = { requests: 0, auth: [] };
  const server = createServer(async (req, res) => {
    seen.requests++;
    seen.auth.push(req.headers.authorization ?? null);
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
    const u = new URL(req.url, "http://x");
    const tags = Object.keys(releases);
    const m = /^\/repos\/DocumentDrivenDX\/helix\/releases\/(latest|tags\/(.+))$/.exec(u.pathname);
    if (m) {
      const tag = m[1] === "latest" ? tags[0] : decodeURIComponent(m[2]);
      const r = releases[tag];
      if (!r) { res.writeHead(404); res.end("{}"); return; }
      const name = r.asset ?? `helix-plugin-package-${tag}.tar.gz`;
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ tag_name: tag, assets: [{ name, digest: "digest" in r ? r.digest : sha(r.gz), browser_download_url: `${base}/download/${tag}/${name}` }] }));
      return;
    }
    const d = /^\/download\/([^/]+)\//.exec(u.pathname);
    if (d && releases[d[1]]) { res.writeHead(200, { "content-type": "application/gzip" }); res.end(releases[d[1]].gz); return; }
    res.writeHead(404); res.end();
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { api: base, seen, close: () => new Promise((r) => server.close(r)) };
}

/* A bundled HELIX directory, as the starter's prepack writes it. */
export function bundle(version = "8.8.0") {
  const dir = mkdtempSync(join(tmpdir(), "helix-bundle-"));
  const gz = packHelix({ version });
  writeFileSync(join(dir, `helix-plugin-package-v${version}.tar.gz`), gz);
  writeFileSync(join(dir, "bundled.json"), JSON.stringify({ tag: `v${version}`, digest: sha(gz), source: `https://github.com/DocumentDrivenDX/helix/releases/download/v${version}/helix-plugin-package-v${version}.tar.gz`, fetchedAt: "2026-10-21T00:00:00.000Z" }));
  mkdirSync(dir, { recursive: true });
  return dir;
}
