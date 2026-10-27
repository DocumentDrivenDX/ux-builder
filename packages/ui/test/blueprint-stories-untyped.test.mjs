/* The blueprint check reads HELIX stories as they are: by their US-<n> ID,
   with or without a type tag (US-151-AC2; FEAT-018 GDL-82).

     npm test --workspace @ux-builder/ui */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { readStory } from "../blueprint/helix.mjs";

const story = (front) => `---\n${front}\n---\n\n# A story\n\n- [ ] **US-4-AC1** — Given a list, when it opens, then it shows.\n`;

describe("US-151-AC2: stories read without a type tag", () => {
  // @covers US-151-AC2
  test("a US-<n> document is a story whether its type is user-stories, user-story or absent; another type, or no ID, is not", () => {
    for (const front of ["ddx:\n  id: US-4\n  type: user-stories", "ddx:\n  id: US-4\n  type: user-story", "ddx:\n  id: US-4"]) {
      assert.deepEqual(readStory(story(front)), { id: "US-4", criteria: ["US-4-AC1"] }, front);
    }
    assert.equal(readStory(story("ddx:\n  id: US-4\n  type: story-test-plan")), null);
    assert.equal(readStory(story("ddx:\n  id: STP-4\n  type: story-test-plan")), null);
  });
});
