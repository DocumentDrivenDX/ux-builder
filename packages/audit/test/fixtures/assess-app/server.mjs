/* A small app for the state proof (FEAT-009 INS-06; STP-062): a sign-in that
   sets a session cookie, a page that opens a modal dialog, and a form whose
   server-side validation keeps valid input and ties the error to its field.
   Each page has one deliberate finding (a hard-coded colour), so every
   checkpoint has something to link. Built SDK CSS is served from the
   repository's packages.

     const { url, close } = await serve(); */

import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PKGS = fileURLToPath(new URL("../../../..", import.meta.url));
const FILES = { "/themes.css": join(PKGS, "tokens/dist/themes.css"), "/fonts.css": join(PKGS, "tokens/dist/fonts.css"), "/ui.css": join(PKGS, "ui/dist/ui.css") };
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const page = (title, body) => `<!doctype html><html lang="en" data-theme="praxis-carbon" data-appearance="light"><head><meta charset="utf-8"><title>${esc(title)}</title>
<link rel="stylesheet" href="/themes.css"><link rel="stylesheet" href="/fonts.css"><link rel="stylesheet" href="/ui.css">
<style>body { margin: 0; padding: var(--piq-space-5); font-family: var(--piq-font-body); color: var(--piq-color-text); background: var(--piq-color-ground); } form { display: grid; gap: var(--piq-space-3); max-inline-size: 30rem; }</style>
</head><body><main>${body}</main></body></html>`;

const signIn = () => page("Sign in", `<h1>Sign in</h1><form method="post" action="/signin"><label>Email <input name="email" type="email" value="tester@example.test"></label><button class="piq-btn">Sign in</button></form><p class="hint" style="color:#ff00aa">Test accounts only.</p>`);
const home = (who) => page("Matters", `<h1>Matters</h1><p id="who">Signed in as ${esc(who)}</p><p class="hint" style="color:#ff00aa">Prebill closes Friday.</p>
<button id="rename" class="piq-btn piq-btn--secondary" type="button">Rename matter</button> <a href="/new">New entry</a> <a href="/signout">Sign out</a>
<p id="name">Halvorsen v. Atlas</p>
<dialog id="d" aria-labelledby="d-title"><form method="dialog" id="df"><h2 id="d-title">Rename matter</h2><label>Name <input id="d-name" name="name" value="Halvorsen v. Atlas"></label><button value="cancel" class="piq-btn piq-btn--secondary">Cancel</button><button id="d-save" value="save" class="piq-btn">Save</button></form></dialog>
<script>
  const d = document.getElementById("d");
  document.getElementById("rename").addEventListener("click", () => d.showModal());
  d.addEventListener("close", () => { if (d.returnValue === "save") document.getElementById("name").textContent = document.getElementById("d-name").value; });
</script>`);
const form = (values = {}, error = null) => page("New entry", `<h1>New entry</h1><form method="post" action="/new" novalidate>
<label>Matter <input id="matter" name="matter" value="${esc(values.matter)}"></label>
<label>Hours <input id="hours" name="hours" value="${esc(values.hours)}"${error ? ' aria-invalid="true" aria-describedby="hours-error"' : ""}></label>
${error ? `<p id="hours-error" role="alert">${esc(error)}</p>` : ""}
<button class="piq-btn">Save entry</button></form><p class="hint" style="color:#ff00aa">Hours in quarters.</p>`);
const done = (v) => page("Saved", `<h1>Saved</h1><p id="saved">${esc(v.matter)}: ${esc(v.hours)} hours</p><p class="hint" style="color:#ff00aa">Saved.</p>`);

const body = (req) => new Promise((r) => { let s = ""; req.on("data", (c) => { s += c; }); req.on("end", () => r(Object.fromEntries(new URLSearchParams(s)))); });
const session = (req) => /(?:^|;\s*)session=([^;]+)/.exec(req.headers.cookie ?? "")?.[1];

export async function serve() {
  const server = createServer(async (req, res) => {
    const { pathname } = new URL(req.url, "http://x");
    const html = (s, status = 200, headers = {}) => { res.writeHead(status, { "content-type": "text/html", ...headers }); res.end(s); };
    const go = (to, headers = {}) => { res.writeHead(303, { location: to, ...headers }); res.end(); };
    if (FILES[pathname] || pathname.startsWith("/fonts/")) {
      const file = FILES[pathname] ?? join(PKGS, "tokens/dist", pathname);
      if (!existsSync(file)) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { "content-type": { ".css": "text/css", ".woff2": "font/woff2" }[extname(file)] ?? "application/octet-stream" });
      res.end(readFileSync(file)); return;
    }
    if (pathname === "/" || pathname === "/signin") {
      if (req.method === "POST") { const { email } = await body(req); return go("/home", { "set-cookie": `session=${encodeURIComponent(email || "tester")}; Path=/; HttpOnly` }); }
      return html(signIn());
    }
    if (pathname === "/signout") return go("/", { "set-cookie": "session=; Path=/; Max-Age=0" });
    const who = session(req);
    if (!who) return go("/");
    if (pathname === "/home") return html(home(decodeURIComponent(who)));
    if (pathname === "/new") {
      if (req.method !== "POST") return html(form());
      const v = await body(req);
      const hours = Number(v.hours);
      if (!v.hours || !Number.isFinite(hours) || hours <= 0 || Math.round(hours * 4) !== hours * 4) return html(form(v, "Enter hours in quarters, such as 1.25 or 2.5."), 422);
      return html(done(v));
    }
    res.writeHead(404); res.end();
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((r) => server.close(r)) };
}
