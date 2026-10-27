/* The app frame is the person's choice, asked with the modality (US-162;
   FEAT-018 GDL-80; CONTRACT-008 Commands).

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { budget, confirmModality, explain, modalityStatus, readState, status } from "../index.mjs";
import { cli, tempApp } from "./helpers.mjs";

const SKILL = readFileSync(new URL("../skill/ux-builder-design/SKILL.md", import.meta.url), "utf8").replace(/\s+/g, " ");
const BP = "docs/ux-builder/blueprint/app.blueprint.json";
const bpOf = (a) => JSON.parse(readFileSync(join(a, BP), "utf8"));
const withDestinations = (a, n) => {
  if (!existsSync(join(a, BP))) { mkdirSync(join(a, BP, ".."), { recursive: true }); writeFileSync(join(a, BP), JSON.stringify({ version: 1, kind: "app", name: "Tasks", supports: { sizeClasses: ["compact"], inputs: ["coarse"] }, screens: [] })); }
  const bp = bpOf(a); bp.destinations = Array.from({ length: n }, (_, i) => ({ id: `d${i + 1}`, label: `Place ${i + 1}`, screen: `s${i + 1}` })); writeFileSync(join(a, BP), JSON.stringify(bp, null, 2)); };

describe("US-162: the app frame is the person's choice, asked with the modality", () => {
  // @covers US-162-AC5
  test("AC5: responsive web needs a frame, with a recommendation from the destinations; it is recorded, and status and the budget follow it", () => {
    const a = tempApp();
    withDestinations(a, 1);
    const before = readFileSync(join(a, BP), "utf8");
    const refused = cli(a, ["modality", "--answer", "A to-do list on my phone", "--modality", "responsive-web", "--size-classes", "compact"]);
    assert.equal(refused.status, 2);
    assert.match(refused.stderr, /modality needs --frame for responsive-web: the app frame the person chooses, one of screen \(Just the screen: no top bar or menus; the screen fills the window\); top-bar .*; top-nav .*; side-nav .*\. Recommend screen \(one destination: nothing to navigate between\); the person decides\./);
    assert.equal(readFileSync(join(a, BP), "utf8"), before, "nothing written");
    assert.match(cli(a, ["modality", "--answer", "x", "--modality", "responsive-web", "--frame", "drawer"]).stderr, /unknown frame "drawer"; use screen, top-bar, top-nav, side-nav/);
    assert.match(cli(a, ["modality", "--answer", "x", "--modality", "chat", "--frame", "screen"]).stderr, /--frame is for responsive-web; chat is drawn as a conversation/);
    assert.ok(budget(a).decisions.includes("the modality, screen sizes and app frame"));
    // The person chooses the top bar over the recommendation.
    const r = confirmModality(a, { answer: "Just my list, with the app's name on top", modalities: "responsive-web", sizeClasses: "compact", frame: "top-bar" });
    assert.equal(r.frame, "top-bar");
    assert.equal(bpOf(a).supports.frame, "top-bar");
    assert.equal(readState(a).modality.frame, "top-bar");
    const m = modalityStatus(a);
    assert.deepEqual([m.confirmed, m.frame, m.recommended.frame], [true, "top-bar", "screen"]);
    assert.ok(!budget(a).decisions.includes("the modality, screen sizes and app frame"));
    assert.match(status(a).text, /\nApp frame: top-bar\.\n/);
    // A changed frame in the blueprint asks again.
    const bp = bpOf(a); bp.supports.frame = "side-nav"; writeFileSync(join(a, BP), JSON.stringify(bp));
    assert.equal(modalityStatus(a).confirmed, false);
    // Chat alone has no frame, and drops one it had.
    confirmModality(a, { answer: "Only a chat", modalities: "chat" });
    assert.equal(bpOf(a).supports.frame, undefined);
    // Many destinations: the side menu is recommended.
    const b = tempApp();
    withDestinations(b, 7);
    assert.deepEqual(modalityStatus(b).recommended, { frame: "side-nav", why: "7 destinations need a side menu" });
  });

  // @covers US-162-AC7
  test("AC7: the skill asks for the frame with the modality, shows the four and recommends one; the glossary explains it", () => {
    assert.match(SKILL, /ask in the same message which \*\*app frame\*\* it should have/);
    for (const f of ["`screen`", "`top-bar`", "`top-nav`", "`side-nav`"]) assert.ok(SKILL.includes(f), f);
    assert.match(SKILL, /Recommend one from the destinations .* the person decides/);
    assert.match(SKILL, /--frame <frame>/);
    assert.match(JSON.stringify(explain({ term: "app frame" })), /nothing \(just the screen\), a top bar with the app's name, navigation across the top, or a side menu/);
  });
});
