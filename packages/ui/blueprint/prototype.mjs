/* Exploratory prototypes (FEAT-018 GDL-40 to GDL-42; ADR-037): a
   disposable, clickable prototype of a blueprint, generated from the
   wireframes' pattern rendering. Each page is one screen in one state at
   one size class, with a banner naming the design question it answers, a
   switcher for its states and size classes, and a link for every action to
   where it leads. It lives under prototype/, outside the app's source, and
   never becomes app code (the ux-builder/no-prototype-import lint rule). */

import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { assets, wireframes } from "./wireframes.mjs";

const require = createRequire(import.meta.url);
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const list = (x) => (Array.isArray(x) ? x : []);

/* The theme that shows a design system: the first theme on it, by name. */
export function themeFor(designSystem) {
  const { themes } = JSON.parse(readFileSync(require.resolve("@ux-builder/tokens/manifest.json"), "utf8"));
  return themes.filter((t) => t.designSystem === designSystem).map((t) => t.name).sort()[0] ?? null;
}

const fileOf = (screen, state, size) => `${state === "ideal" ? screen : `${screen}.${state}`}.${size}.html`;

/* The bar a person uses: the banner, then this screen's states and the size classes, then its actions. */
function bar(bp, page, { question, statesOf, sizes }) {
  const s = list(bp.screens).find((x) => x?.id === page.screen) ?? {};
  const state = (to) => `<a href="${esc(fileOf(page.screen, to, page.sizeClass))}"${to === page.state ? ' aria-current="page"' : ""}>${esc(to)}</a>`;
  const size = (to) => `<a href="${esc(fileOf(page.screen, page.state, to))}"${to === page.sizeClass ? ' aria-current="page"' : ""}>${esc(to)}</a>`;
  const action = (a) => {
    const label = esc(a.label ?? a.id);
    if (typeof a.to !== "string") return `<span>${label}</span>`;
    if (a.to === "back") return `<a href="javascript:history.back()" data-action="${esc(a.id)}">${label} (back)</a>`;
    if (a.to === "external") return `<span data-action="${esc(a.id)}">${label} (leaves the app)</span>`;
    if (a.to.startsWith("state:")) return `<a href="${esc(fileOf(page.screen, a.to.slice(6), page.sizeClass))}" data-action="${esc(a.id)}">${label}</a>`;
    if (a.to.startsWith("modal:")) return `<span data-action="${esc(a.id)}">${label} (opens ${esc(a.to.slice(6))})</span>`;
    return `<a href="${esc(fileOf(a.to, "ideal", page.sizeClass))}" data-action="${esc(a.id)}">${label}</a>`;
  };
  return `<header class="proto-bar" style="position:sticky;top:0;z-index:10;padding:var(--piq-space-2) var(--piq-space-4);background:var(--piq-color-surface);border-block-end:2px dashed var(--piq-color-border);color:var(--piq-color-text);font:var(--piq-font-body, inherit)">
<p class="proto-banner" role="note"><strong>Prototype</strong>, not the app: ${esc(question)}</p>
<nav aria-label="States"><span>State:</span> ${statesOf(page.screen).map(state).join(" · ")}</nav>
<nav aria-label="Size classes"><span>Size:</span> ${sizes.map(size).join(" · ")}</nav>
<nav aria-label="Actions"><span>Actions:</span> ${list(s.actions).map(action).join(" · ") || "<span>none</span>"}</nav>
</header>`;
}

/* The prototype's pages: [{ file, html, screen, state, sizeClass }]. */
export async function prototypePages(bp, { question, theme = "plain" } = {}) {
  const pages = await wireframes(bp, { theme });
  const sizes = [...new Set(pages.map((p) => p.sizeClass))];
  const statesOf = (screen) => [...new Set(pages.filter((p) => p.screen === screen).map((p) => p.state))];
  return pages.map((p) => ({
    file: p.file, screen: p.screen, state: p.state, sizeClass: p.sizeClass,
    html: p.html
      .replace(/<title>([^<]*) — ([a-z]+) wireframe<\/title>/, "<title>$1 — $2 prototype</title>")
      .replace("<body>", `<body data-piq-screen="${esc(p.screen)}" data-prototype="exploratory">\n${bar(bp, p, { question, statesOf, sizes })}`),
  }));
}

/* Write prototype/<dir>/: the pages, their assets and an index that opens the entry screen. */
export async function writePrototype(bp, { root = "prototype", dir, question, theme = "plain" }) {
  const pages = await prototypePages(bp, { question, theme });
  const out = join(root, dir);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(join(out, "assets"), { recursive: true });
  for (const [name, from] of Object.entries(assets(theme))) cpSync(from, join(out, "assets", name));
  for (const p of pages) writeFileSync(join(out, p.file), p.html);
  const entry = list(bp.destinations)[0]?.screen ?? list(bp.screens)[0]?.id;
  const first = pages.find((p) => p.screen === entry && p.state === "ideal") ?? pages[0];
  writeFileSync(join(out, "index.html"), `<!doctype html>\n<meta charset="utf-8">\n<title>Prototype</title>\n<meta http-equiv="refresh" content="0; url=${esc(first?.file ?? "")}">\n<p><a href="${esc(first?.file ?? "")}">Open the prototype</a></p>\n`);
  return { dir: out, pages: pages.length, entry: first?.file ?? null, theme };
}

/* Move prototype/<name>/ under prototype/.archive/ once its question is answered. */
export function archivePrototype(name, { root = "prototype" } = {}) {
  const from = join(root, name);
  if (!existsSync(from)) return null;
  const to = join(root, ".archive", name);
  mkdirSync(join(root, ".archive"), { recursive: true });
  rmSync(to, { recursive: true, force: true });
  renameSync(from, to);
  return to;
}
