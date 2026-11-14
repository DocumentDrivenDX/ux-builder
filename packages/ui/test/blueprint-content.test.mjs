/* A screen whose pattern has no sample of its own is drawn from its content
   items, not as a placeholder (US-161-AC8; FEAT-018 GDL-35, GDL-40): the
   one-screen to-do list of trial tasks-1.

     npm run build --workspace @ux-builder/ui && npm test --workspace @ux-builder/ui */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { wireframes } from "../blueprint/wireframes.mjs";

const BP = {
  version: 1, name: "Tasks", supports: { modalities: ["responsive-web"], sizeClasses: ["compact"] },
  screens: [{
    id: "list", title: "Tasks", pattern: "Page", interactionKinds: ["enter-text", "browse-list", "toggle-item"],
    content: [{ label: "Tasks, full words, oldest first", kind: "data" }, { label: "Add a task", kind: "input" }, { label: "Undo after a tick", kind: "feedback" }],
    actions: [{ id: "add", label: "Add", to: "list", primary: true }, { id: "tick", label: "Tick", to: "list" }],
  }],
  journeys: [{ id: "J-capture", entry: "list", steps: [{ screen: "list", action: "add" }] }],
};
const text = (html) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("US-161: a screen with no sample of its own is drawn from its content", () => {
  // @covers US-161-AC8
  test("AC8: data as three sample entries, ticked off where the screen toggles items; an input as a field with the primary action; feedback as a notice", async () => {
    const page = (await wireframes(BP)).find((p) => p.screen === "list" && p.state === "ideal");
    assert.ok(page, "the list screen is drawn");
    assert.doesNotMatch(page.html, /Placeholder content\./);
    assert.equal((page.html.match(/type="checkbox"/g) ?? []).length, 3);
    assert.match(text(page.html), /Task 1 Task 2 Task 3/, "entries named from the item, singular");
    assert.match(page.html, /<ul data-content="data" aria-label="Tasks, full words, oldest first"/);
    assert.match(page.html, /<div data-content="input">[\s\S]*Add a task[\s\S]*<button[^>]*>Add<\/button>/);
    assert.match(page.html, /data-content="feedback"[\s\S]*Undo after a tick/);
    // Without toggling, the entries are plain; without content, the placeholder stays.
    const plain = (await wireframes({ ...BP, screens: [{ ...BP.screens[0], interactionKinds: ["browse-list"] }] })).find((p) => p.state === "ideal");
    assert.equal((plain.html.match(/type="checkbox"/g) ?? []).length, 0);
    const empty = (await wireframes({ ...BP, screens: [{ ...BP.screens[0], content: [] }] })).find((p) => p.state === "ideal");
    assert.match(empty.html, /Placeholder content\./);
  });
});
