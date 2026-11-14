/* The chosen app frame in the blueprint: checked against the destinations,
   and drawn by the wireframes and prototypes (US-162-AC2, AC3).

     npm run build --workspace @ux-builder/ui && npm test --workspace @ux-builder/ui */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { checkBlueprint } from "../blueprint/index.mjs";
import { wireframes } from "../blueprint/wireframes.mjs";

const bp = (frame, n) => ({
  version: 1, kind: "app", name: "Rivers", supports: { sizeClasses: ["compact", "expanded"], inputs: ["coarse", "fine"], ...(frame ? { frame } : {}) },
  destinations: Array.from({ length: n }, (_, i) => ({ id: `d${i + 1}`, label: `Place ${i + 1}`, screen: "home" })),
  screens: [{ id: "home", title: "Home", pattern: "Page", content: [{ label: "Rivers nearby", kind: "data" }] }],
});
const frameFindings = (b) => checkBlueprint(b).filter((f) => f.path === "/supports/frame");

describe("US-162: the chosen frame in the blueprint", () => {
  // @covers US-162-AC2
  test("AC2: supports.frame is one of the four, and check warns when it no longer fits the destinations", () => {
    for (const [frame, n] of [["screen", 1], ["top-bar", 0], ["top-nav", 3], ["side-nav", 8]]) assert.deepEqual(frameFindings(bp(frame, n)), [], `${frame} with ${n}`);
    assert.match(frameFindings(bp("screen", 3))[0].message, /supports\.frame is screen, which has no navigation, but the blueprint has 3 destinations\./);
    assert.equal(frameFindings(bp("screen", 3))[0].severity, "warning");
    assert.match(frameFindings(bp("side-nav", 1))[0].message, /supports\.frame is side-nav, but the blueprint has one destination: there is nothing to navigate between\./);
    assert.match(frameFindings(bp("top-nav", 7))[0].message, /7 destinations do not fit across the top bar \(up to 5\)/);
    assert.ok(checkBlueprint(bp("drawer", 1)).some((f) => f.rule === "blueprint.valid" && /supports\/frame|frame/.test(`${f.path} ${f.message}`)), "an unknown frame fails the schema");
  });

  // @covers US-162-AC3
  test("AC3: wireframes, and the prototypes made from them, are drawn in the chosen frame", async () => {
    const page = async (frame, n) => (await wireframes(bp(frame, n))).find((p) => p.sizeClass === "expanded" && p.state === "ideal").html;
    const screen = await page("screen", 1);
    assert.doesNotMatch(screen, /piq-shell/, "just the screen: no shell");
    const top = await page("top-bar", 1);
    assert.match(top, /class="piq-shell" data-frame="top-bar"/);
    assert.doesNotMatch(top, /piq-shell__side|piq-shell__bar/);
    const across = await page("top-nav", 3);
    assert.match(across, /data-frame="top-nav"[\s\S]*class="piq-primary-nav piq-shell__topnav"/);
    assert.doesNotMatch(across, /piq-shell__side/);
    const side = await page("side-nav", 3);
    assert.match(side, /class="piq-shell"(?! data-frame)[\s\S]*piq-shell__side/);
    // Not chosen: navigation at the side when there are destinations, as before.
    assert.match(await page(null, 2), /piq-shell__side/);
  });
});
