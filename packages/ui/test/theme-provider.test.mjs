/* ThemeProvider and useTheme (US-011, FEAT-004 SDK-04 to SDK-07), against
   the built package.

     npm run build && npm run test:ui */

import { setSystemDark, mediaListeners } from "./dom.mjs";
import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider, resolveAppearance, useTheme } from "../dist/index.js";

let root, host;
function render(el) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(el));
  return host;
}
afterEach(() => { act(() => root?.unmount()); host?.remove(); setSystemDark(false); });

// A probe that records what useTheme() returned on each render.
function Probe({ log, expose }) {
  const t = useTheme();
  log?.push({ theme: t.theme, appearance: t.appearance });
  if (expose) expose.current = t;
  return h("span", { "data-probe": `${t.theme}/${t.appearance}` });
}

describe("US-011", () => {
  // @covers US-011-AC1
  test("AC1: the element carries data-theme and data-appearance; useTheme returns them", () => {
    const log = [];
    const el = render(h(ThemeProvider, { theme: "praxis-carbon", appearance: "light" }, h(Probe, { log }))).firstChild;
    assert.equal(el.getAttribute("data-theme"), "praxis-carbon");
    assert.equal(el.getAttribute("data-appearance"), "light");
    assert.deepEqual(log.at(-1), { theme: "praxis-carbon", appearance: "light" });
  });

  // @covers US-011-AC2
  test("AC2: system resolves to the user's preference on the first render, never 'system'", () => {
    setSystemDark(true);
    const log = [];
    render(h(ThemeProvider, { theme: "databricks", appearance: "system" }, h(Probe, { log })));
    assert.deepEqual(log[0], { theme: "databricks", appearance: "dark" });
    assert.ok(log.every((l) => l.appearance !== "system"));
  });

  // @covers US-011-AC3
  test("AC3: with system, a change of preference is followed without a reload", () => {
    const el = render(h(ThemeProvider, { theme: "synaptiq", appearance: "system" }, h(Probe))).firstChild;
    assert.equal(el.getAttribute("data-appearance"), "light");
    act(() => setSystemDark(true));
    assert.equal(el.getAttribute("data-appearance"), "dark");
    assert.equal(el.querySelector("[data-probe]").getAttribute("data-probe"), "synaptiq/dark");
  });

  test("a fixed appearance ignores the system preference and stops listening", () => {
    const el = render(h(ThemeProvider, { theme: "synaptiq", appearance: "light" }, h(Probe))).firstChild;
    assert.equal(mediaListeners(), 0);
    act(() => setSystemDark(true));
    assert.equal(el.getAttribute("data-appearance"), "light");
  });

  // @covers US-011-AC4
  test("AC4: setTheme and setAppearance switch at run time and report the change", () => {
    const api = { current: null }, changes = [];
    const el = render(h(ThemeProvider, { theme: "praxis-material", appearance: "dark", onChange: (c) => changes.push(c) }, h(Probe, { expose: api }))).firstChild;
    act(() => api.current.setTheme("praxis-fluentui"));
    assert.equal(el.getAttribute("data-theme"), "praxis-fluentui");
    act(() => api.current.setAppearance("light"));
    assert.equal(el.getAttribute("data-appearance"), "light");
    assert.deepEqual(changes, [{ theme: "praxis-fluentui", appearance: "dark" }, { theme: "praxis-fluentui", appearance: "light" }]);
  });

  test("a new prop value wins over an earlier switch", () => {
    const api = { current: null };
    const el = render(h(ThemeProvider, { theme: "praxis", appearance: "dark" }, h(Probe, { expose: api }))).firstChild;
    act(() => api.current.setTheme("plain"));
    act(() => root.render(h(ThemeProvider, { theme: "databricks", appearance: "dark" }, h(Probe, { expose: api }))));
    assert.equal(el.getAttribute("data-theme"), "databricks");
  });

  // @covers US-011-AC5
  test("AC5: nested providers: each subtree uses its nearest provider", () => {
    const outer = [], inner = [];
    const el = render(h(ThemeProvider, { theme: "praxis", appearance: "dark" },
      h(Probe, { log: outer }),
      h(ThemeProvider, { theme: "plain", appearance: "light" }, h(Probe, { log: inner })))).firstChild;
    assert.deepEqual(outer.at(-1), { theme: "praxis", appearance: "dark" });
    assert.deepEqual(inner.at(-1), { theme: "plain", appearance: "light" });
    assert.equal(el.querySelector("[data-theme]").getAttribute("data-theme"), "plain");
  });

  // @covers US-011-AC6
  test("AC6: resolved token values are set as custom properties, with no data-theme", () => {
    const tokens = { "piq-color-ground": "#0B0B0C", "piq-color-text": "#FAFAFA", "piq-brand-logo-image": 'url("x.svg")' };
    const el = render(h(ThemeProvider, { tokens, appearance: "dark" }, h(Probe))).firstChild;
    assert.equal(el.hasAttribute("data-theme"), false);
    assert.equal(el.style.getPropertyValue("--piq-color-ground"), "#0B0B0C");
    assert.equal(el.style.getPropertyValue("--piq-brand-logo-image"), "initial", "artwork is not inlined, and the page's is reset");
    assert.equal(el.style.getPropertyValue("--piq-card-bg"), "initial", "a token it is not given is reset, so the page's theme cannot reach it");
    assert.equal(el.querySelector("[data-probe]").getAttribute("data-probe"), "null/dark");
  });

  // @covers US-011-AC7
  test("AC7: an appearance the theme lacks falls back to its own, with a warning", () => {
    const warned = [];
    const orig = console.warn;
    console.warn = (m) => warned.push(m);
    try {
      const el = render(h(ThemeProvider, { theme: "plain", appearance: "dark" }, h(Probe))).firstChild;
      assert.equal(el.getAttribute("data-appearance"), "light");
      assert.ok(warned.some((m) => /theme "plain" has no dark appearance; using light/.test(m)), warned.join("\n"));
    } finally { console.warn = orig; }
  });

  test("an unknown theme warns and still sets the attribute", () => {
    const warned = [];
    const orig = console.warn;
    console.warn = (m) => warned.push(m);
    try {
      const el = render(h(ThemeProvider, { theme: "acme", appearance: "light" }, h(Probe))).firstChild;
      assert.equal(el.getAttribute("data-theme"), "acme");
      assert.ok(warned.some((m) => /unknown theme "acme"/.test(m)));
    } finally { console.warn = orig; }
  });

  test("useTheme outside a provider explains itself", () => {
    const orig = console.error;
    console.error = () => {};
    try {
      assert.throws(() => render(h(Probe)), /useTheme\(\) needs a <ThemeProvider> above it/);
    } finally { console.error = orig; }
  });

  test("resolveAppearance: the asked-for appearance if the theme has it, else its default", () => {
    assert.equal(resolveAppearance("praxis", "light", "dark"), "light");
    assert.equal(resolveAppearance("praxis", "system", "light"), "light");
    assert.equal(resolveAppearance("plain", "system", "dark"), "light");
    assert.equal(resolveAppearance("unknown-theme", "dark"), "dark");
  });
});
