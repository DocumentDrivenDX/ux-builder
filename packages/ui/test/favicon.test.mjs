/* The favicon follows the theme (US-010-AC11, AC12, FEAT-004 SDK-16),
   against the built package. happy-dom does not cascade custom properties,
   so a theme's favicon token is set on the provider's own element here;
   logo.browser.test.mjs checks the real token in Chromium, and the
   starter's e2e test the whole thing in an app.

     npm run build && npm test --workspace @ux-builder/ui */

import "./dom.mjs";
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { Favicon, ThemeProvider, applyFavicon } from "../dist/index.js";

const MARK = "http://localhost/assets/mark-v2.svg";
const withFavicon = { "--piq-brand-favicon": `url("${MARK}")` };
const sdkIcon = () => document.head.querySelector("link[data-piq-favicon]");
let root, host;
function render(el) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(el));
}
beforeEach(() => {
  document.head.innerHTML = '<link rel="icon" href="/app.ico" id="own">';
});
afterEach(() => {
  act(() => root?.unmount()); host?.remove(); root = null;
  document.documentElement.removeAttribute("style");
});

describe("US-010 favicon", () => {
  // @covers US-010-AC11
  test("AC11: the top-level provider sets the theme's favicon, last in the head, and follows changes", () => {
    render(h(ThemeProvider, { theme: "praxis", appearance: "dark", style: withFavicon }, "app"));
    const link = sdkIcon();
    assert.ok(link, "an SDK icon link");
    assert.equal(link.getAttribute("href"), MARK);
    assert.equal(link.rel, "icon");
    assert.equal(link.type, "image/svg+xml");
    assert.equal(document.head.lastElementChild, link, "after the app's own, so browsers use it");
    assert.ok(document.getElementById("own"), "the app's own icon is kept");

    // A theme without a favicon: the SDK's link goes, the app's shows.
    act(() => root.render(h(ThemeProvider, { theme: "databricks", appearance: "light" }, "app")));
    assert.equal(sdkIcon(), null);
    act(() => root.render(h(ThemeProvider, { theme: "praxis", appearance: "light", style: withFavicon }, "app")));
    assert.equal(sdkIcon().getAttribute("href"), MARK);
    assert.equal(document.head.querySelectorAll("link[data-piq-favicon]").length, 1, "one link, reused");
  });

  test("unmounting the provider removes its icon", () => {
    render(h(ThemeProvider, { theme: "praxis", style: withFavicon }, "app"));
    assert.ok(sdkIcon());
    act(() => root.unmount()); root = null;
    assert.equal(sdkIcon(), null);
  });

  test("<Favicon /> reads the theme on <html>, for a page without a provider", () => {
    document.documentElement.style.setProperty("--piq-brand-favicon", `url("${MARK}")`);
    render(h(Favicon));
    assert.equal(sdkIcon().getAttribute("href"), MARK);
  });

  test("applyFavicon infers the type and handles a theme with none", () => {
    const el = document.createElement("div");
    el.style.setProperty("--piq-brand-favicon", 'url("http://localhost/a/mark.png?v=2")');
    document.body.appendChild(el);
    assert.equal(applyFavicon(el), "http://localhost/a/mark.png?v=2");
    assert.equal(sdkIcon().type, "image/png");
    assert.equal(applyFavicon(document.createElement("div")), null);
    assert.equal(sdkIcon(), null);
    el.remove();
  });

  test("a mark the bundler inlined as a data: URI is read whole, quotes and brackets included", () => {
    // What Vite writes for a mark under its inline limit: single quotes and a url(#…) inside.
    const inlined = "data:image/svg+xml,%3csvg%20id='Layer_1'%20xmlns='http://www.w3.org/2000/svg'%3e%3cpath%20fill='url(%23g)'/%3e%3c/svg%3e";
    const el = document.createElement("div");
    el.style.setProperty("--piq-brand-favicon", `url("${inlined}")`);
    document.body.appendChild(el);
    assert.equal(applyFavicon(el), inlined);
    assert.equal(sdkIcon().getAttribute("href"), inlined);
    assert.equal(sdkIcon().type, "image/svg+xml");
    el.style.setProperty("--piq-brand-favicon", 'url("http://localhost/a/say \\"hi\\".svg")');
    assert.equal(applyFavicon(el), 'http://localhost/a/say "hi".svg', "CSS escapes undone");
    el.style.setProperty("--piq-brand-favicon", "url(http://localhost/a/bare.png)");
    assert.equal(applyFavicon(el), "http://localhost/a/bare.png", "unquoted");
    el.remove();
  });

  // @covers US-010-AC12
  test("AC12: an embedded view, a nested provider and favicon={false} set no icon", () => {
    render(h(ThemeProvider, { tokens: { "piq-brand-favicon": `url("${MARK}")` }, style: withFavicon }, "embedded"));
    assert.equal(sdkIcon(), null, "embedded view");
    act(() => root.render(h(ThemeProvider, { theme: "praxis", favicon: false, style: withFavicon }, "off")));
    assert.equal(sdkIcon(), null, "favicon={false}");
    act(() => root.render(h(ThemeProvider, { theme: "databricks", favicon: false },
      h(ThemeProvider, { theme: "praxis", style: withFavicon }, "nested"))));
    assert.equal(sdkIcon(), null, "a nested provider");
    assert.ok(document.getElementById("own"), "the app's own icon stays");
  });
});
