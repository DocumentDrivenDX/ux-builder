/* HELIX for a new app (FEAT-010 HLF-01 to HLF-04, HLI-01, HLI-02, HLS-01,
   HLS-02; ADR-027 decisions 1 to 4 and 8).

   Fetches the latest HELIX release's plugin package from GitHub (or the tag
   asked for), verifies it, and installs its skill and catalogue into the app
   as a project skill. Falls back to the package bundled with this starter
   when the network or the package fails, and says why. Nothing downloaded is
   run; only regular files under the package's helix/ root are written.

     const helix = await getHelix({ tag, offline });   // { files, manifest, provenance }
     install(helix, appDir);                            // .claude/skills/helix/ */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, normalize, posix } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const HERE = fileURLToPath(new URL(".", import.meta.url));
export const REPO = "DocumentDrivenDX/helix";
export const ASSET = (tag) => `helix-plugin-package-${tag}.tar.gz`;
export const BUNDLED = join(HERE, "helix");
const TIMEOUT = 20_000;

/* ------------------------------------------------------------- tar (read only) */
const str = (b, o, n) => { const s = b.subarray(o, o + n); const z = s.indexOf(0); return (z < 0 ? s : s.subarray(0, z)).toString("utf8"); };
const oct = (b, o, n) => parseInt(str(b, o, n).trim() || "0", 8);

/* Regular files of a .tar.gz, by path. Rejects the whole archive on any link,
   device, absolute path or ".." (HLS-01): a package is all or nothing. */
export function untar(gz) {
  const b = gunzipSync(gz);
  const files = new Map();
  let longName = null, pax = {};
  for (let o = 0; o + 512 <= b.length;) {
    if (b.subarray(o, o + 512).every((x) => x === 0)) break;
    const size = oct(b, o + 124, 12), type = String.fromCharCode(b[o + 156] || 48);
    const prefix = str(b, o + 345, 155);
    let name = longName ?? pax.path ?? (prefix ? `${prefix}/${str(b, o, 100)}` : str(b, o, 100));
    const body = b.subarray(o + 512, o + 512 + size);
    o += 512 + Math.ceil(size / 512) * 512;
    if (type === "L") { longName = body.toString("utf8").replace(/\0+$/, ""); continue; }
    if (type === "x") { pax = Object.fromEntries(body.toString("utf8").split("\n").filter(Boolean).map((l) => l.slice(l.indexOf(" ") + 1)).map((kv) => [kv.slice(0, kv.indexOf("=")), kv.slice(kv.indexOf("=") + 1)])); continue; }
    if (type === "g") continue;
    longName = null; pax = {};
    name = name.replace(/^\.\//, "");
    if (name.startsWith("/") || /^[A-Za-z]:/.test(name) || name.split("/").includes("..")) throw new Error(`unsafe path in the package: ${name}`);
    if (type === "5") continue;
    if (type !== "0" && type !== "7") throw new Error(`the package holds a ${{ 1: "hard link", 2: "symbolic link", 3: "device", 4: "device", 6: "FIFO" }[type] ?? `type-${type} entry`}: ${name}`);
    files.set(name, Buffer.from(body));
  }
  return files;
}

/* ------------------------------------------------------------- verify */
/* The package's contents check (HLF-02). Returns its plugin manifest. */
export function check(files, tag) {
  const need = ["helix/.claude-plugin/plugin.json", "helix/skills/helix/SKILL.md", "helix/skills/helix/references/graph.yml"];
  for (const f of need) if (!files.has(f)) throw new Error(`the package has no ${f}`);
  for (const d of ["activities/", "concerns/"]) if (![...files.keys()].some((k) => k.startsWith(`helix/skills/helix/references/${d}`))) throw new Error(`the package has no references/${d}`);
  for (const k of files.keys()) if (!k.startsWith("helix/")) throw new Error(`the package has a file outside helix/: ${k}`);
  const manifest = JSON.parse(files.get("helix/.claude-plugin/plugin.json").toString("utf8"));
  if (tag && manifest.version !== tag.replace(/^v/, "")) throw new Error(`the package says version ${manifest.version}, not ${tag}`);
  return manifest;
}

/* ------------------------------------------------------------- fetch */
async function get(url, { token, accept, timeoutMs }) {
  const r = await fetch(url, { headers: { "user-agent": "ux-builder-create-app", accept, ...(token ? { authorization: `Bearer ${token}` } : {}) }, redirect: "follow", signal: AbortSignal.timeout(timeoutMs) });
  if (!r.ok) throw new Error(r.status === 403 || r.status === 429 ? `GitHub rate-limited the request (${r.status})` : r.status === 404 ? "no such release" : `GitHub answered ${r.status}`);
  return r;
}

/* The release and its verified package from GitHub (HLF-01 to HLF-03). */
export async function fetchRelease({ tag, api = process.env.UX_BUILDER_HELIX_API ?? "https://api.github.com", token = process.env.GITHUB_TOKEN, timeoutMs = TIMEOUT, keepArchive = false } = {}) {
  const rel = await (await get(`${api}/repos/${REPO}/releases/${tag ? `tags/${encodeURIComponent(tag)}` : "latest"}`, { token, accept: "application/vnd.github+json", timeoutMs })).json();
  const asset = (rel.assets ?? []).find((a) => a.name === ASSET(rel.tag_name));
  if (!asset) throw new Error(`release ${rel.tag_name} has no ${ASSET(rel.tag_name)}`);
  // The download is a public asset: the token is not sent to the asset host.
  const gz = Buffer.from(await (await get(asset.browser_download_url, { accept: "application/octet-stream", timeoutMs })).arrayBuffer());
  const digest = "sha256:" + createHash("sha256").update(gz).digest("hex");
  if (asset.digest && asset.digest !== digest) throw new Error(`the package's SHA-256 (${digest}) is not the one GitHub publishes (${asset.digest})`);
  const files = untar(gz);
  const manifest = check(files, rel.tag_name);
  return { files, manifest, ...(keepArchive ? { archive: gz } : {}), provenance: { version: manifest.version, tag: rel.tag_name, source: asset.browser_download_url, digest: asset.digest ?? null, fetchedAt: new Date().toISOString(), bundled: false } };
}

/* The package bundled with this starter (ADR-027 decision 4). */
export function bundled({ dir = process.env.UX_BUILDER_HELIX_BUNDLE ?? BUNDLED } = {}) {
  const meta = join(dir, "bundled.json");
  if (!existsSync(meta)) throw new Error(`no HELIX is bundled in ${dir}`);
  const b = JSON.parse(readFileSync(meta, "utf8"));
  const gz = readFileSync(join(dir, ASSET(b.tag)));
  const digest = "sha256:" + createHash("sha256").update(gz).digest("hex");
  if (b.digest && b.digest !== digest) throw new Error("the bundled HELIX does not match its recorded digest");
  const files = untar(gz);
  const manifest = check(files, b.tag);
  return { files, manifest, provenance: { version: manifest.version, tag: b.tag, source: b.source, digest: b.digest ?? null, fetchedAt: b.fetchedAt, bundled: true } };
}

/* HELIX for a new app: the latest (or tag), else the bundled copy with the
   reason; a tag that cannot be had is an error (HLF-04, HLS-02). */
export async function getHelix({ tag, offline = false, log = () => {} } = {}) {
  if (offline) { const h = bundled(); h.provenance.reason = "--helix-offline"; return h; }
  try { return await fetchRelease({ tag }); }
  catch (e) {
    const code = e.cause?.code ?? e.cause?.errors?.[0]?.code;
    const reason = e.name === "TimeoutError" || e.name === "AbortError" ? "GitHub did not answer within 20 seconds" : code || e.message === "fetch failed" ? `no network (${code ?? "unreachable"})` : e.message;
    if (tag) { const err = new Error(`HELIX ${tag} could not be fetched and verified: ${reason}`); err.code = "pinned"; throw err; }
    log(`HELIX: the latest release could not be used (${reason}); using the bundled copy`);
    const h = bundled();
    h.provenance.reason = reason;
    return h;
  }
}

/* Install the skill and its catalogue as the app's project skill (HLI-01, HLI-02). */
export function install(helix, appDir) {
  const root = join(appDir, ".claude", "skills", "helix");
  let n = 0;
  for (const [path, data] of helix.files) {
    if (!path.startsWith("helix/skills/helix/")) continue;
    const rel = posix.relative("helix/skills/helix", path);
    const to = normalize(join(root, rel));
    if (!to.startsWith(root)) throw new Error(`unsafe path in the package: ${path}`);
    mkdirSync(dirname(to), { recursive: true });
    writeFileSync(to, data);
    n++;
  }
  writeFileSync(join(root, "HELIX-VERSION.json"), JSON.stringify(helix.provenance, null, 2) + "\n");
  return { root, files: n };
}

/* The installed catalogue's file, by its path under references/. */
export const ref = (helix, path) => helix.files.get(`helix/skills/helix/references/${path}`)?.toString("utf8") ?? null;
