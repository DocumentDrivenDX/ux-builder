/* The theme page's story index (themepage/stories.js): Storybook's own ids
   for every story, and a story for every widget and pattern in the SDK. */

import assert from "node:assert/strict";
import { globSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { storyNameFromExport, toId } from "storybook/internal/csf";
import { indexStories, storyId, storybookUrl } from "../src/themepage/stories.js";

const UI = fileURLToPath(new URL("../../../packages/ui/", import.meta.url));
const catalogue = JSON.parse(readFileSync(join(UI, "catalogue.json"), "utf8"));

// The story files as the page sees them; a module's stories are faked from its source, as Node cannot import JSX.
const files = globSync("src/**/*.stories.jsx", { cwd: UI }).map((path) => {
  const source = readFileSync(join(UI, path), "utf8");
  const title = source.match(/title:\s*"([^"]+)"/)[1];
  const component = source.match(/component:\s*(\w+)/)?.[1];
  const module = { default: { title, component: component && { name: component } } };
  for (const [, key, body] of source.matchAll(/^export const (\w+) = (.*)$/gm)) module[key] = /render/.test(body) ? { render: () => null } : {};
  return { path, source, module };
});
const { stories, byComponent } = indexStories(files);

test("every story's id is Storybook's own", () => {
  assert.ok(stories.length > 60);
  for (const s of stories) assert.equal(s.id, toId(s.title, storyNameFromExport(s.key)), `${s.title} › ${s.key}`);
  assert.equal(storyId("Patterns/Extended screens", "ComboboxAndTooltip"), "patterns-extended-screens--combobox-and-tooltip");
});

test("every widget, screen pattern and assistant component has a story, its own file's first", () => {
  for (const kind of ["widgets", "patterns", "assistant"]) {
    for (const w of catalogue[kind].filter((x) => x.type === "component")) assert.ok(byComponent.get(w.name)?.length, `${w.name} has a story`);
  }
  assert.equal(byComponent.get("Button")[0].title, "UI Components/Button");
  assert.equal(byComponent.get("CollectionList")[0].key, "Ready", "the file's first story, not its first by name");
  assert.ok(byComponent.get("CollectionList").some((s) => s.key === "Failed"));
});

test("a Storybook link names the story and the theme in its appearance", () => {
  assert.equal(storybookUrl("http://localhost:6006/", "ui-components-button--primary", "praxis-carbon", "dark"), "http://localhost:6006/?path=/story/ui-components-button--primary&globals=theme:praxis-carbon-dark");
});
