/* Start an app with a shell command and wait until it answers; stop it
   afterwards. Shared by the audit's --serve and the assessment's baseline. */

import { spawn } from "node:child_process";

export async function serve({ command, url, cwd = process.cwd(), timeoutMs = 60_000, status = 500 }) {
  const child = spawn(command, { shell: true, stdio: "ignore", detached: true, cwd });
  const stop = () => { if (child.exitCode == null) { try { process.kill(-child.pid); } catch { /* gone */ } } };
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    try { if ((await fetch(url)).status < status) return { stop }; } catch { /* starting */ }
    if (child.exitCode != null) { const e = new Error(`"${command}" exited (${child.exitCode}) before ${url} answered`); e.code = "exited"; throw e; }
    await new Promise((r) => setTimeout(r, 250));
  }
  stop();
  const e = new Error(`${url} did not answer within ${Math.round(timeoutMs / 1000)} s of "${command}"`);
  e.code = "timeout";
  throw e;
}

const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2" };

/* Serve a folder of static pages (a generated prototype) on a free local
   port: { url, stop }. Nothing outside the folder is served. */
export async function serveFolder(dir) {
  const { createServer } = await import("node:http");
  const { readFileSync } = await import("node:fs");
  const { extname, join, normalize, relative } = await import("node:path");
  const server = createServer((req, res) => {
    const path = normalize(join(dir, decodeURIComponent(new URL(req.url, "http://x").pathname)));
    if (relative(dir, path).startsWith("..")) { res.writeHead(403).end(); return; }
    try { res.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" }).end(readFileSync(path)); } catch { res.writeHead(404).end(); }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { url: `http://127.0.0.1:${server.address().port}/`, stop: () => new Promise((r) => server.close(r)) };
}
