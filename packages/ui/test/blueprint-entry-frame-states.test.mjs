/* What VIP List session 2 needed the blueprint to say: a screen entered from
   outside (a scan, a link), a frame per screen, a state of the screen's own
   with what it shows, and who each part of the app is for (nav.audience).

     npm test --workspace @ux-builder/ui */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { checkBlueprint } from "../blueprint/index.mjs";
import { wireframes } from "../blueprint/wireframes.mjs";

const st = ["empty", "loading", "error"];
const base = () => ({
  version: 1, kind: "app", name: "VIP List",
  supports: { modalities: ["responsive-web"], sizeClasses: ["compact", "medium", "expanded", "large"], inputs: ["coarse", "fine"], frame: "top-nav" },
  destinations: [{ id: "tonight", label: "Tonight", screen: "tonight" }, { id: "passes", label: "My passes", screen: "passes" }],
  screens: [
    { id: "tonight", title: "Tonight", pattern: "CollectionList", states: st, users: ["U-1"], actions: [{ id: "open", label: "Open my passes", to: "passes" }] },
    { id: "passes", title: "My passes", pattern: "CollectionList", states: st, users: ["U-1"], actions: [{ id: "back", label: "Tonight", to: "tonight" }] },
    { id: "door", title: "Door check", pattern: "RecordDetail", states: st, users: ["U-3"], actions: [{ id: "letin", label: "Let in", to: "back", primary: true }] },
  ],
});
const rules = (bp) => checkBlueprint(bp).map((f) => `${f.severity} ${f.rule} ${f.path}`);

describe("VIP List session 2: the blueprint says what the person meant", () => {
  test("a screen entered from outside is not unreachable, and neither is what it leads to", () => {
    const bp = base();
    assert.ok(rules(bp).some((r) => /flow\.reachable \/screens\/2/.test(r)), "without entry, the door is unreachable");
    bp.screens[2].entry = "scan";
    bp.screens.push({ id: "used", title: "Already used", pattern: "RecordDetail", states: st, actions: [{ id: "back", label: "Back", to: "door" }] });
    bp.screens[2].actions.push({ id: "why", label: "Why", to: "used" });
    assert.deepEqual(rules(bp).filter((r) => /flow\.reachable/.test(r)), []);
  });

  test("a screen's own frame draws it without the app's navigation", async () => {
    const bp = base();
    bp.screens[2].entry = "scan";
    bp.screens[2].frame = "screen";
    assert.deepEqual(rules(bp).filter((r) => /^error/.test(r)), []);
    const pages = await wireframes(bp);
    const door = pages.find((p) => p.file === "door.compact.html"), tonight = pages.find((p) => p.file === "tonight.compact.html");
    assert.doesNotMatch(door.html, /My passes/, "no guest tabs on the door page");
    assert.match(tonight.html, /My passes/, "the guest screens keep theirs");
  });

  test("a state of the screen's own is drawn as its notice, and refused without one", async () => {
    const bp = base();
    bp.screens[2].entry = "scan";
    bp.screens[2].states = [...st, "already-used"];
    assert.ok(rules(bp).some((r) => /^error blueprint\.valid \/screens\/2\/states/.test(r)), "a custom state with nothing saying what it shows");
    bp.screens[2].stateNotices = { "already-used": { tone: "error", title: "Already used at 11:42 PM", text: "Do not let in on this pass." } };
    assert.deepEqual(rules(bp).filter((r) => /^error/.test(r)), []);
    const page = (await wireframes(bp)).find((p) => p.file === "door.already-used.compact.html");
    assert.ok(page, "a page for the state");
    assert.match(page.html, /Already used at 11:42 PM/);
    assert.match(page.html, /Do not let in on this pass\./);
  });

  test("nav.audience: a tab for other users warns; reached by its own link, it does not", () => {
    const bp = base();
    bp.screens[2].entry = "link";
    bp.destinations.push({ id: "door", label: "Door", screen: "door" });
    assert.ok(rules(bp).some((r) => /warning nav\.audience \/destinations\/2/.test(r)));
    bp.destinations.pop();
    assert.deepEqual(rules(bp).filter((r) => /nav\.audience/.test(r)), []);
    bp.screens.forEach((s) => delete s.users);
    bp.destinations.push({ id: "door", label: "Door", screen: "door" });
    assert.deepEqual(rules(bp).filter((r) => /nav\.audience/.test(r)), [], "without users, nothing to judge");
  });
});
