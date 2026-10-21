/* inspect(): the audit's checks on a page as it is (FEAT-009 INS-01, INS-02,
   INS-05; US-062-AC1, AC2, AC5; STP-062). Pages load the built
   @ux-builder/tokens and @ux-builder/ui CSS over HTTP.

     npm run build && npm test --workspace @ux-builder/audit */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { audit } from "../audit.mjs";
import { inspect } from "../inspect.mjs";

const PKG = fileURLToPath(new URL("..", import.meta.url));
const FILES = { "/themes.css": join(PKG, "../tokens/dist/themes.css"), "/fonts.css": join(PKG, "../tokens/dist/fonts.css"), "/ui.css": join(PKG, "../ui/dist/ui.css") };
const page = (body, script = "") => `<!doctype html><html lang="en" data-theme="praxis-carbon" data-appearance="light"><head><meta charset="utf-8"><title>t</title>
<link rel="stylesheet" href="/themes.css"><link rel="stylesheet" href="/fonts.css"><link rel="stylesheet" href="/ui.css">
<style>body { margin: 0; font-family: var(--piq-font-body); color: var(--piq-color-text); background: var(--piq-color-ground); }</style>
</head><body>${body}<script>${script}</script></body></html>`;
const LONG = "Entries flagged by the time rules wait here for a partner to review them before prebill closes on Friday afternoon, ".repeat(4);

const PAGES = {
  // A session the server set, an open dialog, a filled form and a scrolled position: all must survive.
  "/state.html": page(`<main><h1>Matters</h1><p id="who"></p>
    <form id="f"><label>Matter <input id="matter" name="matter"></label><label>Hours <input id="hours" name="hours"></label></form>
    <p style="max-inline-size:none">${LONG}</p><div style="block-size:2000px"></div></main>
    <dialog id="d" aria-label="Edit matter"><button id="cancel">Cancel</button><button id="save" class="piq-btn">Save</button><button class="piq-btn">Send</button></dialog>`,
  `document.getElementById("who").textContent = document.cookie.includes("session=") ? "Signed in" : "Signed out";
   document.getElementById("d").showModal();`),
  "/plain.html": page(`<main><h1>Report</h1><button class="piq-btn">Save</button><button class="piq-btn">Send</button><p id="wide" style="max-inline-size:none">${LONG}</p>
    <p id="pink" style="color:#ff00aa">Hard-coded pink</p></main>`),
};

let server, base, browser;
before(async () => {
  server = createServer((req, res) => {
    const path = new URL(req.url, "http://x").pathname;
    if (PAGES[path]) { res.writeHead(200, { "content-type": "text/html", "set-cookie": "session=abc; Path=/" }); res.end(PAGES[path]); return; }
    const file = FILES[path] ?? (path.startsWith("/fonts/") || path.startsWith("/brand/") ? join(PKG, "../tokens/dist", path) : null);
    if (!file || !existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "content-type": { ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2" }[extname(file)] ?? "application/octet-stream" });
    res.end(readFileSync(file));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); server?.close(); });

/* The page's state, as a user would see it. */
const stateOf = (p) => p.evaluate(() => ({
  url: location.href,
  dialog: document.getElementById("d")?.open ?? null,
  values: [...document.querySelectorAll("input")].map((i) => i.value),
  focused: document.activeElement?.id ?? null,
  scroll: [scrollX, scrollY],
  cookie: document.cookie,
  theme: document.documentElement.dataset.theme,
}));

async function prepared() {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await context.newPage();
  await p.goto(`${base}/state.html`, { waitUntil: "networkidle" });
  await p.reload({ waitUntil: "networkidle" }); // the cookie is now sent: signed in
  // Close the dialog to fill the form, then reopen it, as a user part-way through a task.
  await p.evaluate(() => document.getElementById("d").close());
  await p.fill("#matter", "Halvorsen v. Atlas");
  await p.fill("#hours", "12.5");
  await p.evaluate(() => { scrollTo(0, 300); document.getElementById("d").showModal(); document.getElementById("cancel").focus(); });
  let navigations = 0;
  p.on("framenavigated", (f) => { if (f === p.mainFrame()) navigations++; });
  return { context, p, navigations: () => navigations };
}

describe("US-062: inspect() checks the state just reached", () => {
  // @covers US-062-AC1
  test("AC1: inspecting leaves the URL, session, form, open dialog, focus, scroll and theme as they were", async () => {
    const { context, p, navigations } = await prepared();
    try {
      const before = await stateOf(p);
      assert.equal(before.dialog, true);
      assert.match(await p.textContent("#who"), /Signed in/);
      const result = await inspect(p, { cwd: PKG });
      assert.deepEqual(await stateOf(p), before);
      assert.equal(navigations(), 0, "no navigation or reload");
      assert.ok(result.findings.some((f) => f.rule === "one-primary-action"), "it checked the dialog it found open");
      assert.ok(result.findings.every((f) => typeof f.rule === "string" && f.severity));
    } finally { await context.close(); }
  });

  // @covers US-062-AC5
  test("AC5: state-affecting checks are skipped unless asked; asked, they run apart and restore what they can", async () => {
    const { context, p } = await prepared();
    try {
      const before = await stateOf(p);
      const plain = await inspect(p, { cwd: PKG });
      assert.deepEqual(plain.skipped.sort(), ["focus-obscured", "modal-escape"]);
      assert.deepEqual(plain.stateAffecting, { ran: [], restored: true, notes: [] });
      const full = await inspect(p, { cwd: PKG, stateAffecting: true });
      assert.deepEqual(full.skipped, []);
      assert.deepEqual(full.stateAffecting.ran.sort(), ["focus-obscured", "modal-escape"]);
      const afterState = await stateOf(p);
      assert.deepEqual({ ...afterState, dialog: before.dialog, focused: before.focused }, before, "URL, form, scroll, session and theme restored");
      // Escape closed the dialog, which cannot be reopened from outside, and focus left it: both said, not hidden.
      assert.equal(afterState.dialog, false);
      assert.equal(full.stateAffecting.restored, false);
      assert.match(full.stateAffecting.notes.join(" "), /Escape closed "Edit matter"/);
      assert.match(full.stateAffecting.notes.join(" "), /focus could not be put back/);
      // With nothing that cannot be undone, focus-obscured alone restores everything.
      const { context: c2, p: p2 } = await prepared();
      try {
        const b2 = await stateOf(p2);
        const r2 = await inspect(p2, { cwd: PKG, stateAffecting: ["focus-obscured"] });
        assert.deepEqual(r2.stateAffecting, { ran: ["focus-obscured"], restored: true, notes: [] });
        assert.deepEqual(await stateOf(p2), b2);
      } finally { await c2.close(); }
    } finally { await context.close(); }
  });

  // @covers US-062-AC2
  test("AC2: audit() and inspect() give the same findings for the same page and theme", async () => {
    const url = `${base}/plain.html`;
    const r = await audit({ urls: [url], themes: ["praxis-carbon"], appearances: ["light"], widths: [1280], contrast: true, rules: { brand: false }, cwd: PKG });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    try {
      const p = await context.newPage();
      await p.goto(url, { waitUntil: "networkidle" });
      await p.addStyleTag({ content: "*, *::before, *::after { transition: none !important; }" });
      const i = await inspect(p, { cwd: PKG, rules: { brand: false }, contrast: true, stateAffecting: true });
      const key = (f) => [f.rule, f.selector ?? "", f.rule_selector ?? "", f.property ?? "", f.value ?? ""].join("|");
      const fromAudit = r.findings.filter((f) => f.rule !== "theme-applied" && f.rule !== "fonts").map(key).sort();
      const fromInspect = [...new Set(i.findings.map(key))].sort();
      assert.ok(fromAudit.length >= 3, JSON.stringify(fromAudit));
      assert.deepEqual(fromInspect, fromAudit);
    } finally { await context.close(); }
  });
});
