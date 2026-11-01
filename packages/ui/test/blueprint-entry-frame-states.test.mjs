/* What VIP List session 2 needed the blueprint to say: a screen entered from
   outside (a scan, a link), a frame per screen, a state of the screen's own
   with what it shows, and who each part of the app is for (nav.audience).

     npm test --workspace @ux-builder/ui */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { checkBlueprint } from "../blueprint/index.mjs";
import { score } from "../blueprint/explore.mjs";
import { prototypePages } from "../blueprint/prototype.mjs";
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
  // @covers US-165-AC5
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

  // @covers US-165-AC5
  test("a state of the screen's own is drawn as its notice, and refused without one", async () => {
    const bp = base();
    bp.screens[2].entry = "scan";
    bp.screens[2].states = [...st, "already-used"];
    assert.ok(rules(bp).some((r) => /^error blueprint\.valid \/screens\/2\/states/.test(r)), "a custom state with nothing saying what it shows");
    bp.screens[2].stateNotices = { "already-used": { tone: "error", title: "Already used at 11:42 PM", text: "Do not let in on this pass." } };
    assert.deepEqual(rules(bp).filter((r) => /^error/.test(r)), []);
    // A journey's step may name it (session 3 found the step schema still allowed only the four), and a
    // badly named state is refused.
    bp.journeys = [{ id: "J-door", story: "US-6", entry: "door", steps: [{ screen: "door", action: "letin" }], alternates: [{ from: 0, steps: [{ screen: "door", state: "already-used" }], reason: "Already used" }] }];
    assert.deepEqual(rules(bp).filter((r) => /^error .*journeys/.test(r)), []);
    assert.ok(rules({ ...bp, screens: bp.screens.map((x) => (x.id === "door" ? { ...x, states: [...x.states, "Bad State"] } : x)) }).some((r) => /^error blueprint\.valid \/screens\/2\/states\/\d/.test(r)));
    // @covers US-166-AC6
    // The values the state changes replace the samples (VIP List session 3: "Valid tonight" under "Already used").
    bp.screens[2].content = [{ label: "Guest", kind: "data" }, { label: "Pass status", kind: "data" }];
    bp.screens[2].stateNotices["already-used"].values = { "Pass status": "Already used" };
    assert.deepEqual(rules(bp).filter((r) => /^error/.test(r)), []);
    const page = (await wireframes(bp)).find((p) => p.file === "door.already-used.compact.html");
    assert.ok(page, "a page for the state");
    assert.match(page.html, />Already used</);
    assert.doesNotMatch(page.html, />Let in</, "an error notice holds back the main action");
    assert.match(page.html, /Already used at 11:42 PM/);
    assert.match(page.html, /Do not let in on this pass\./);
  });

  // @covers US-165-AC5
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

describe("VIP List session 3: a screen's other actions are on the page", () => {
  // @covers US-166-AC3
  test("the ideal state draws each action that is not the primary one, under the screen, so a journey can be walked on the page", async () => {
    const bp = base();
    const tonight = (await wireframes(bp)).find((p) => p.file === "tonight.compact.html").html;
    assert.match(tonight, /<button[^>]*>Open my passes<\/button>/);
    const door = (await wireframes(bp)).find((p) => p.file === "door.compact.html").html;
    assert.equal((door.match(/>Let in</g) ?? []).length <= 1, true, "the primary action is not drawn twice");
  });
});

describe("VIP List sessions 2 and 3: the prototype bar is readable in dark", () => {
  // @covers US-166-AC6
  test("its links take the theme's strong text colour, underlined, not the browser's blue", async () => {
    const pages = await prototypePages(base(), { appearance: "dark" });
    assert.match(pages.find((p) => p.file === "tonight.compact.html").html, /\.proto-bar a \{ color: var\(--piq-color-text-strong, var\(--piq-color-text\)\); text-decoration: underline;/);
  });
});

describe("VIP List session 3: a journey that comes back where it started", () => {
  // @covers US-165-AC5
  test("its shortest path goes there and back, not nowhere", () => {
    const bp = base();
    bp.journeys = [{ id: "J-round", story: "US-1", entry: "tonight", steps: [{ screen: "tonight", action: "open" }, { screen: "passes", action: "back" }, { screen: "tonight" }] }];
    assert.equal(score(bp)[0].shortestPath, 2);
  });
});

describe("VIP List session 2: the prototype shows the design's own content, not placeholders", () => {
  // @covers US-165-AC6
  test("a form draws a field for each content label, by what it asks; a list draws its labels' sample values", async () => {
    const bp = base();
    bp.screens.push({ id: "claim", title: "Claim a spot", pattern: "FormPage", states: st, entry: "link", content: ["Mobile number", "Date of birth", "Spots (1 or 2)", "Email (optional)", "Promotional texts (opt-in)"].map((label) => ({ label, kind: "data" })), actions: [{ id: "submit", label: "Get my pass", to: "passes", primary: true }] });
    bp.screens[0].content = ["Event", "Venue", "City", "Time", "Spots left"].map((label) => ({ label, kind: "data" }));
    const pages = await wireframes(bp);
    const claim = pages.find((p) => p.file === "claim.compact.html").html;
    assert.doesNotMatch(claim, /Field 1|Field 2/);
    assert.match(claim, /type="tel"/);
    assert.match(claim, /placeholder="MM\/DD\/YYYY"/);
    assert.match(claim, /type="radio"[\s\S]*type="radio"/, "1 or 2 as a choice");
    assert.match(claim, /type="email"/);
    assert.match(claim, /type="checkbox"/);
    assert.match(claim, /Get my pass/);
    const tonight = pages.find((p) => p.file === "tonight.expanded.html").html;
    assert.doesNotMatch(tonight, /Item 1|A\. Person/);
    assert.match(tonight, />Event 1</);
    assert.match(tonight, />Austin</);
    assert.match(tonight, />14 left</);
    // @covers US-166-AC6
    // On a phone a list shows its first three items, or those marked compact (VIP List session 3).
    const fields = (html) => [...html.matchAll(/class="piq-collection__(?:primary|field)">(?:<span[^>]*>[^<]*<\/span>)?([^<]*)</g)].slice(0, 5).map((m) => m[1]);
    assert.deepEqual(fields(pages.find((p) => p.file === "tonight.compact.html").html).slice(0, 3), ["Event 1", "Venue 1", "Austin"]);
    bp.screens[0].content = bp.screens[0].content.map((c) => ({ ...c, ...(["Event", "Time", "Spots left"].includes(c.label) ? { compact: true } : {}) }));
    assert.deepEqual(rules(bp).filter((r) => /^error/.test(r)), []);
    const marked = (await wireframes(bp)).find((p) => p.file === "tonight.compact.html").html;
    assert.deepEqual(fields(marked).slice(0, 3), ["Event 1", "10:00 PM", "14 left"]);
  });
});

describe("VIP List sessions 3 and 4: a person's details are asked before they are shown", () => {
  // @covers US-167-AC1
  test("screen.details-asked warns about a name shown on the pass and at the door that no form asks for; asked, it does not", () => {
    const bp = base();
    bp.screens.push({ id: "claim", title: "Claim a spot", pattern: "FormPage", states: st, entry: "link", content: ["Mobile number", "Date of birth"].map((label) => ({ label, kind: "data" })), actions: [{ id: "submit", label: "Get my pass", to: "passes", primary: true }] });
    bp.screens[2].content = ["Guest", "Spots", "Pass status"].map((label) => ({ label, kind: "data" }));
    bp.screens[1].content = ["Event", "Name"].map((label) => ({ label, kind: "data" }));
    const asked = () => rules(bp).filter((r) => /screen\.details-asked/.test(r));
    assert.deepEqual(asked(), ["warning screen.details-asked /screens/1/content/1", "warning screen.details-asked /screens/2/content/0"]);
    bp.screens[3].content.splice(1, 0, { label: "Name on the list", kind: "data" });
    assert.deepEqual(asked(), [], "asked on the claim form");
    bp.screens[1].content = ["Event name", "Venue"].map((label) => ({ label, kind: "data" }));
    assert.deepEqual(asked(), [], "an event's name is not a person's");
  });
});
