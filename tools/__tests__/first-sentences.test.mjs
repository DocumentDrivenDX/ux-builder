/* The catalogue's purpose extractor: a sentence ends at . ! or ? followed by
   a space or the end of the text, never at a "." inside a number or "e.g.".

     npm test */

import assert from "node:assert/strict";
import { test } from "node:test";
import { firstSentences } from "../gen-catalogue.mjs";

test("a version number does not end a sentence", () => {
  assert.equal(
    firstSentences("An Adaptive Card (schema 1.6 and earlier) drawn with components. Actions call onAction. More detail."),
    "An Adaptive Card (schema 1.6 and earlier) drawn with components. Actions call onAction.",
  );
});

test("a WCAG reference does not end a sentence", () => {
  assert.equal(firstSentences("Never under the bar (WCAG 2.4.11), even when it wraps."), "Never under the bar (WCAG 2.4.11), even when it wraps.");
});

test("plain sentences split as before", () => {
  assert.equal(firstSentences("One. Two! Three? Four."), "One. Two!");
  assert.equal(firstSentences("One. Two. Three.", 1), "One.");
  assert.equal(firstSentences("No end mark"), "No end mark");
});
