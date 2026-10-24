/* The release workflow tags the commit that has the versions it publishes
   (ADR-034; README "Publishing a release"). changesets/action@v2 creates tags
   through the GitHub API at the commit that started the run, the merge,
   unless it pushes them with git: then the tags changeset publish made on the
   Version Packages commit go up. Without this, ui@0.11.0 and three more were
   tagged on a commit whose package.json still said 0.10.0 (2026-10-24).

     npm test */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parse } from "yaml";

const workflow = parse(readFileSync(new URL("../../.github/workflows/release.yml", import.meta.url), "utf8"));
const steps = workflow.jobs.release.steps;

test("the release pushes its tags with git, so each tag is on the Version Packages commit", () => {
  const publish = steps.find((s) => String(s.uses ?? "").startsWith("changesets/action@"));
  assert.ok(publish, "the publish step uses changesets/action");
  assert.equal(publish.uses, "changesets/action@v2");
  assert.equal(publish.with["push-with-git-cli"], true);
  assert.equal(publish.with["create-github-releases"], true);
  assert.notEqual(publish.with["push-git-tags"], false, "tags are pushed");
  // It runs after the bump is committed and pushed, from the commit checked out at main's tip.
  const i = steps.indexOf(publish);
  assert.ok(steps.findIndex((s) => s.id === "push") < i, "the Version Packages commit is pushed before publishing");
  assert.equal(steps.find((s) => String(s.uses ?? "").startsWith("actions/checkout@")).with.ref, "main");
  assert.equal(workflow.permissions.contents, "write", "the workflow's token may push tags");
});
