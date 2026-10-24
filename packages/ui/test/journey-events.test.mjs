/* Journey events to the app's own sink (US-143; FEAT-018 GDL-62;
   ADR-038; CONTRACT-008 "Amendments"), against the built package.

     npm run build && npm run test:ui */

import "./dom.mjs";
import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import { act, createElement as h, useState } from "react";
import { createRoot } from "react-dom/client";
import { JourneyProvider, useJourneyStep } from "../dist/index.js";
import { StatePanel } from "../dist/patterns.js";

let root, host;
function render(el) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(el));
  return host;
}
afterEach(() => { act(() => root?.unmount()); root = null; host?.remove(); });

/* A two-screen journey: the map (step 1) and a river's details (step 2), whose
   Save completes it; the map can show a state panel. */
function Map({ panel }) {
  useJourneyStep("J-find", 1, { screen: "map" });
  return h("main", null, panel ? h(StatePanel, { kind: panel }) : h("p", null, "Rivers"));
}
function Detail() {
  const j = useJourneyStep("J-find", 2, { screen: "detail" });
  return h("main", null, h("button", { onClick: () => j.complete() }, "Save"));
}
function Saved() {
  useJourneyStep("J-saved", 1, { screen: "saved" });
  return h("main", null, "Saved");
}
let go;
function App({ sink, start = "map", panel }) {
  const [at, setAt] = useState(start);
  go = setAt;
  const screen = at === "map" ? h(Map, { panel }) : at === "detail" ? h(Detail) : h(Saved);
  return sink === undefined ? screen : h(JourneyProvider, { sink }, screen);
}
const kinds = (events) => events.map((e) => e.type);

describe("US-143: send journey events to the app's own analytics", () => {
  // @covers US-143-AC1
  test("AC1: start, steps and completion reach the sink, each with journey, screen and step IDs and a timestamp", () => {
    const events = [];
    const el = render(h(App, { sink: (e) => events.push(e) }));
    act(() => go("detail"));
    act(() => el.querySelector("button").click());
    assert.deepEqual(kinds(events), ["journey-start", "step", "step", "complete"]);
    assert.deepEqual(events.map(({ at, ...e }) => e), [
      { type: "journey-start", journey: "J-find", screen: "map", step: 1 },
      { type: "step", journey: "J-find", screen: "map", step: 1 },
      { type: "step", journey: "J-find", screen: "detail", step: 2 },
      { type: "complete", journey: "J-find", screen: "detail", step: 2 },
    ]);
    for (const e of events) assert.ok(!Number.isNaN(Date.parse(e.at)) && e.at.endsWith("Z"), e.at);
    for (const e of events) assert.deepEqual(Object.keys(e).sort(), ["at", "journey", "screen", "step", "type"], "no user content");
    // A sink written inline, a new function each render, keeps the journey: nothing restarts or is abandoned.
    const more = [];
    act(() => root.render(h(App, { sink: (e) => more.push(e), start: "map" })));
    act(() => root.render(h(App, { sink: (e) => more.push(e), start: "map" })));
    assert.deepEqual(more, []);
  });

  // @covers US-143-AC2
  test("AC2: a journey left before completion, an error panel, an empty result and a search with no results reach the sink", () => {
    const events = [];
    const sink = (e) => events.push(e);
    render(h(App, { sink, panel: "error" }));
    assert.deepEqual(events.at(-1), { ...events.at(-1), type: "error-shown", journey: "J-find", screen: "map", step: 1 });
    act(() => root.render(h(App, { sink, panel: "empty" })));
    act(() => root.render(h(App, { sink, panel: "no-results" })));
    act(() => go("saved"));
    assert.deepEqual(kinds(events), ["journey-start", "step", "error-shown", "empty-result", "no-results-search", "abandon", "journey-start", "step"]);
    assert.deepEqual((({ at, ...e }) => e)(events[5]), { type: "abandon", journey: "J-find", screen: "map", step: 1 });
    // Leaving the app with a journey under way abandons it.
    act(() => root.unmount());
    root = null;
    assert.deepEqual((({ at, ...e }) => e)(events.at(-1)), { type: "abandon", journey: "J-saved", screen: "saved", step: 1 });
  });

  // @covers US-143-AC3
  test("AC3: with no provider, or a provider with no sink, nothing is emitted and nothing is stored", () => {
    const stored = () => [window.localStorage.length, window.sessionStorage.length];
    const before = stored();
    for (const sink of [undefined, null]) {
      const el = render(h(App, { sink, panel: "error" }));
      act(() => root.render(h(App, { sink })));
      act(() => go("detail"));
      act(() => el.querySelector("button").click());
      act(() => root.unmount()); root = null; host.remove();
    }
    assert.deepEqual(stored(), before);
    // A sink given later starts the events then, not before.
    const events = [];
    render(h(App, { sink: null }));
    act(() => root.render(h(App, { sink: (e) => events.push(e) })));
    assert.deepEqual(kinds(events), ["journey-start", "step"]);
  });

  // @covers US-143-AC4
  test("AC4: a full journey with fetch, sendBeacon and XMLHttpRequest spied on calls none of them", () => {
    const calls = [];
    const saved = { fetch: globalThis.fetch, xhr: globalThis.XMLHttpRequest, beacon: navigator.sendBeacon, wfetch: window.fetch, wxhr: window.XMLHttpRequest };
    const spy = (name) => (...args) => { calls.push(name); return name === "sendBeacon" ? true : Promise.resolve(new Response("")); };
    globalThis.fetch = window.fetch = spy("fetch");
    globalThis.XMLHttpRequest = window.XMLHttpRequest = class { constructor() { calls.push("XMLHttpRequest"); } open() {} send() {} };
    Object.defineProperty(navigator, "sendBeacon", { value: spy("sendBeacon"), configurable: true, writable: true });
    try {
      const events = [];
      const el = render(h(App, { sink: (e) => events.push(e), panel: "no-results" }));
      act(() => go("detail"));
      act(() => el.querySelector("button").click());
      act(() => go("saved"));
      act(() => root.unmount()); root = null;
      assert.ok(events.length >= 6);
      assert.deepEqual(calls, []);
    } finally {
      globalThis.fetch = saved.fetch; window.fetch = saved.wfetch; globalThis.XMLHttpRequest = saved.xhr; window.XMLHttpRequest = saved.wxhr;
      Object.defineProperty(navigator, "sendBeacon", { value: saved.beacon, configurable: true, writable: true });
    }
  });
});
