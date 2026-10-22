/* Fixture apps for the audit's modality and theme verdicts and its journey
   report (FEAT-014 MOD-08 to MOD-10, FEAT-015 RPT-01 to RPT-04): a clean
   twin of each modality and one page per seeded defect, rendered from the
   SDK's own components (so they track it) and served with the built
   @ux-builder/tokens and @ux-builder/ui CSS, as an app serves them.

     const apps = await modalityApps(); … apps.url("/web.html"); apps.close(); */

import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Card, Logo } from "@ux-builder/ui";
import { AdaptiveCard } from "@ux-builder/ui/adaptive-cards";
import { Conversation } from "@ux-builder/ui/assistant";
import { AppShell, Page, Stack } from "@ux-builder/ui/patterns";

const PKG = fileURLToPath(new URL("../..", import.meta.url));
const FILES = { "/themes.css": join(PKG, "../tokens/dist/themes.css"), "/fonts.css": join(PKG, "../tokens/dist/fonts.css"), "/ui.css": join(PKG, "../ui/dist/ui.css"), "/patterns.css": join(PKG, "../ui/dist/patterns.css") };

// What the top-level ThemeProvider does on "piq:set-theme": switch, and keep the favicon on the theme's.
const PROVIDER = `<script>
addEventListener("piq:set-theme", (e) => {
  const app = document.getElementById("app");
  app.dataset.theme = e.detail.theme; app.dataset.appearance = e.detail.appearance;
  const m = /url\\(\\s*(?:"((?:[^"\\\\]|\\\\.)*)"|'((?:[^'\\\\]|\\\\.)*)'|([^\\s"'()]+))\\s*\\)/.exec(getComputedStyle(app).getPropertyValue("--piq-brand-favicon"));
  const href = m && (m[1] ?? m[2] ?? m[3]).replace(/\\\\(.)/g, "$1");
  let link = document.querySelector("link[data-piq-favicon]");
  if (!href) { link?.remove(); return; }
  if (!link) { link = document.createElement("link"); link.rel = "icon"; link.setAttribute("data-piq-favicon", ""); document.head.append(link); }
  link.href = href;
});
</script>`;
const page = (body, { screen = null, head = "" } = {}) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Fixture</title>
<link rel="stylesheet" href="/themes.css"><link rel="stylesheet" href="/fonts.css"><link rel="stylesheet" href="/ui.css"><link rel="stylesheet" href="/patterns.css">
<style>body { margin: 0; } #app { min-height: 100vh; background: var(--piq-color-ground); color: var(--piq-color-text); font-family: var(--piq-font-body); }</style>${head}${PROVIDER}</head>
<body><div id="app" data-theme="praxis-carbon" data-appearance="light"${screen ? ` data-piq-screen="${screen}"` : ""}>${body}</div></body></html>`;

const NAV = ["Home", "Settings", "Help"].map((label, i) => ({ id: label.toLowerCase(), label, href: `#${label.toLowerCase()}`, icon: ["home", "view", "info"][i] }));
const shell = (content, props = {}) => renderToStaticMarkup(h(AppShell, { nav: NAV, current: "home", brand: h(Logo), ...props }, content));
const content = (title, ...more) => h(Page, { title }, h(Stack, null, h(Card, { title: "Next" }, h("p", null, "Frame the first feature, then plan its screens.")), ...more));

const MESSAGES = [
  { id: "u1", role: "user", text: "What is due this week?" },
  { id: "a1", role: "assistant", parts: [{ type: "text", text: "Two bills are due on Friday." }] },
];
const CARD = { type: "AdaptiveCard", version: "1.6", body: [{ type: "TextBlock", text: "Bill B-1044 is ready", weight: "Bolder" }, { type: "TextBlock", text: "£12,400, due Friday.", wrap: true }] };
const conversation = (messages) => renderToStaticMarkup(h("div", { style: { height: "100vh", display: "grid", gridTemplateRows: "auto minmax(0, 1fr)" } }, h("header", { style: { padding: "var(--piq-space-3)" } }, h(Logo)), h(Conversation, { messages, onSend: () => {}, onRegenerate: () => {} })));

// A colour that is no token's, for the seeded theme defects.
const PINK = '<p id="pink" style="color:#ff00aa">Hard-coded pink</p>';

export const PAGES = {
  // responsive-web: the clean shell, and one held in a fixed-width frame whose navigation never adapts.
  "/web.html": page(shell(content("Home")), { screen: "home" }),
  "/web-frozen.html": page(`<div style="inline-size:360px;block-size:100vh">${shell(content("Home"), { adapt: "container" })}</div>`, { screen: "home" }),
  // chat: the full-screen Conversation, and a page without one.
  "/chat.html": page(conversation(MESSAGES), { screen: "assistant" }),
  "/chat-missing.html": page(renderToStaticMarkup(h("div", null, h("header", { style: { padding: "var(--piq-space-3)" } }, h(Logo)), h(Page, { title: "Assistant" }, h(Card, { title: "Ask" }, h("p", null, "Type a question below."))))), { screen: "assistant" }),
  // hybrid-chat: a reply with an Adaptive Card part, and replies without one.
  "/hybrid.html": page(conversation([...MESSAGES, { id: "a2", role: "assistant", parts: [{ type: "text", text: "Here it is." }, { type: "adaptive-card", id: "c1", card: CARD }] }]), { screen: "assistant" }),
  "/hybrid-no-card.html": page(conversation(MESSAGES), { screen: "assistant" }),
  // The journey report: settings is found by its path, not data-piq-screen; orphan is on no journey.
  "/settings.html": page(shell(content("Settings", h("div", { dangerouslySetInnerHTML: { __html: PINK } })))),
  "/orphan.html": page(shell(content("Orphan", h("div", { dangerouslySetInnerHTML: { __html: '<p id="faint" style="color:var(--piq-color-border)">Too faint to read</p>' } })))),
};

/* A blueprint with two journeys that share the settings screen. */
export const BLUEPRINT = {
  version: 1, kind: "app", name: "Fixture",
  supports: { sizeClasses: ["compact", "medium", "expanded", "large"], inputs: ["coarse", "fine"], modalities: ["responsive-web"] },
  destinations: [{ id: "home", label: "Home", screen: "home" }, { id: "settings", label: "Settings", screen: "settings" }],
  screens: [
    { id: "home", title: "Home", pattern: "Page", actions: [{ id: "open-settings", label: "Settings", to: "settings" }] },
    { id: "settings", title: "Settings", pattern: "Page", path: "/settings.html" },
    { id: "orphan", title: "Orphan", pattern: "Page", path: "/orphan.html" },
  ],
  journeys: [
    { id: "J-setup", story: "US-001", entry: "home", steps: [{ screen: "home", action: "open-settings" }, { screen: "settings" }] },
    { id: "J-tour", story: "US-002", entry: "settings", steps: [{ screen: "settings" }] },
  ],
};

export async function modalityApps() {
  const server = createServer((req, res) => {
    const path = new URL(req.url, "http://x").pathname;
    if (PAGES[path]) { res.writeHead(200, { "content-type": "text/html" }); res.end(PAGES[path]); return; }
    const file = FILES[path] ?? (path.startsWith("/fonts/") || path.startsWith("/brand/") ? join(PKG, "../tokens/dist", path) : null);
    if (!file || !existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "content-type": { ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".png": "image/png" }[extname(file)] ?? "application/octet-stream" });
    res.end(readFileSync(file));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { base, url: (p) => `${base}${p}`, close: () => server.close() };
}
