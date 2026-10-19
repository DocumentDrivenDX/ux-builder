/* The icon library, @ux-builder/ui/icons (US-010-AC13, AC14, FEAT-004 SDK-03),
   against the built package.

     npm run build && npm test --workspace @ux-builder/ui */

import "./dom.mjs";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { Icon, ThemeProvider, registerIcons } from "../dist/index.js";
import * as library from "../dist/icons.js";
import { exportName, libraryMap } from "../scripts/gen-icons.mjs";

const PKG = fileURLToPath(new URL("..", import.meta.url));
let root, host;
function render(el) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(el));
  return host;
}
afterEach(() => { act(() => root?.unmount()); host?.remove(); root = null; });
const drawn = (el) => { const s = el.querySelector("svg.piq-icon"); return s && [s.getAttribute("data-icon"), s.getAttribute("data-icon-set")]; };

describe("US-010 icon library", () => {
  // @covers US-010-AC13
  test("AC13: every Lucide icon, by its Lucide name, with each set's own glyph where one matches", () => {
    const { ICON_LIBRARY_NAMES } = library;
    assert.ok(ICON_LIBRARY_NAMES.length > 2000, `${ICON_LIBRARY_NAMES.length} icons`);
    for (const name of ["play", "pin", "paperclip", "send", "star", "bookmark", "eye-off", "circle-check"]) {
      const icon = library[exportName(name)];
      assert.equal(icon?.name, name, name);
      for (const set of ["material", "fluent", "carbon", "lucide"]) assert.match(icon.glyphs[set]?.viewBox ?? "", /\d/, `${name} has a ${set} glyph`);
    }
    // Hand-checked mappings, false friends included: Material's "pin" is a PIN keypad, its "tag" a hashtag.
    const map = libraryMap();
    const want = {
      play: { material: "play_arrow", fluent: "play", carbon: "play" },
      pin: { material: "keep", fluent: "pin", carbon: "pin" },
      paperclip: { material: "attach_file", fluent: "attach", carbon: "attachment" },
      tag: { material: "sell", fluent: "tag", carbon: "tag" },
      "eye-off": { material: "visibility_off", fluent: "eye_off", carbon: "view--off" },
      "circle-check": { material: "check_circle", fluent: "checkmark_circle", carbon: "checkmark--outline" },
      "message-square": { material: "chat", fluent: "chat", carbon: "chat" },
      "triangle-alert": { material: "warning", fluent: "warning", carbon: "warning--alt" },
    };
    for (const [name, sets] of Object.entries(want)) for (const [set, g] of Object.entries(sets)) assert.equal(map[name][set], g, `${name} in ${set}`);
    assert.equal(new Set(Object.keys(map).map(exportName)).size, Object.keys(map).length, "one export per name");
  });

  test("an icon passed as icon, or registered, follows the theme's set; a set without one draws Lucide's", () => {
    let el = render(h(ThemeProvider, { theme: "praxis-material" }, h(Icon, { icon: library.iconPin })));
    assert.deepEqual(drawn(el), ["pin", "material"]);
    act(() => root.render(h(ThemeProvider, { theme: "praxis-carbon" }, h(Icon, { icon: library.iconPin }))));
    assert.deepEqual(drawn(el), ["pin", "carbon"]);
    act(() => root.unmount()); host.remove();

    registerIcons(library.iconPlay, library.iconPaperclip);
    el = render(h(ThemeProvider, { theme: "praxis-fluentui" }, h(Icon, { name: "play", label: "Play" }), h(Icon, { name: "paperclip" })));
    const svgs = el.querySelectorAll("svg.piq-icon");
    assert.deepEqual([...svgs].map((s) => [s.getAttribute("data-icon"), s.getAttribute("data-icon-set")]), [["play", "fluent"], ["paperclip", "fluent"]]);
    assert.equal(svgs[0].getAttribute("aria-label"), "Play");
    const onlyLucide = library[exportName(Object.entries(libraryMap()).find(([, m]) => !m.carbon)[0])];
    act(() => root.render(h(ThemeProvider, { theme: "praxis-carbon" }, h(Icon, { icon: onlyLucide }))));
    assert.equal(el.querySelector("svg.piq-icon").getAttribute("data-icon-set"), "lucide");
  });

  test("a shared name keeps its shared glyph even if a library icon of that name is registered", () => {
    registerIcons({ name: "search", glyphs: { lucide: { viewBox: "0 0 1 1", body: "<rect/>" } } });
    const el = render(h(ThemeProvider, { theme: "praxis-material" }, h(Icon, { name: "search" })));
    assert.deepEqual(drawn(el), ["search", "material"]);
  });

  // @covers US-010-AC14
  test("AC14: an app's own icon registers and draws through Icon; unsafe markup is refused", () => {
    assert.deepEqual(registerIcons({ name: "acme-gavel", glyphs: { lucide: { viewBox: "0 0 24 24", body: '<path d="M4 20h10"/>' } } }), ["acme-gavel"]);
    const el = render(h(ThemeProvider, { theme: "praxis-carbon" }, h(Icon, { name: "acme-gavel", label: "Ruling" })));
    const svg = el.querySelector("svg.piq-icon");
    assert.deepEqual([svg.getAttribute("data-icon"), svg.getAttribute("data-icon-set")], ["acme-gavel", "lucide"]);
    assert.equal(svg.getAttribute("stroke"), "currentColor", "drawn like a Lucide icon");
    for (const body of ['<script>alert(1)</script>', '<path onclick="x()"/>', '<a href="https://x"><path/></a>']) {
      assert.throws(() => registerIcons({ name: "bad", glyphs: { lucide: { viewBox: "0 0 24 24", body } } }), /without scripts/);
    }
    assert.throws(() => registerIcons({ name: "bad", glyphs: { photoshop: { viewBox: "0 0 1 1", body: "" } } }), /an icon is/);
  });

  test("an unknown name says where to find it", () => {
    const warn = console.warn; const seen = [];
    console.warn = (m) => seen.push(m);
    try { render(h(Icon, { name: "not-an-icon" })); } finally { console.warn = warn; }
    assert.match(seen.join(""), /@ux-builder\/ui\/icons/);
  });

  test("an app bundles only the icons it imports", async () => {
    const { build } = await import("vite");
    const dir = mkdtempSync(join(tmpdir(), "icons-shake-"));
    try {
      writeFileSync(join(dir, "entry.js"), `import { iconPin, iconPlay, iconPaperclip } from ${JSON.stringify(join(PKG, "dist/icons.js"))}; console.log(iconPin, iconPlay, iconPaperclip);`);
      const [out] = await build({ logLevel: "silent", root: dir, configFile: false, build: { write: false, minify: false, lib: { entry: join(dir, "entry.js"), formats: ["es"], fileName: "out" } } });
      const code = out.output[0].code;
      assert.equal((code.match(/name: "/g) ?? []).length, 3, "three icons");
      assert.ok(code.length < 20000, `${code.length} bytes, not the whole library`);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});
