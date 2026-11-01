/* The journey walk (US-166): each journey clicked through a served
   prototype, by its actions' labels, never through the prototype's bar.

     npm test --workspace @ux-builder/audit */

import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, test } from "node:test";
import { serveFolder, walkJourneys } from "../audit.mjs";

const dir = mkdtempSync(join(tmpdir(), "walk-"));
after(() => rmSync(dir, { recursive: true, force: true }));
const page = (id, body) => writeFileSync(join(dir, `${id}.compact.html`), `<!doctype html><html><body><header class="proto-bar"><a href="done.compact.html">Save</a></header><main data-piq-screen="${id}">${body}</main></body></html>`);
page("list", `<h1>List</h1><a href="detail.compact.html">Open</a>`);
page("detail", `<h1>Detail</h1><button onclick="location.href='done.compact.html'">Save</button>`);
page("done", `<h1>Done</h1>`);
page("stuck", `<h1>Stuck</h1>`);
page("events", `<h1>My events</h1><ul><li><a href="post.compact.html">Velvet Fridays</a></li></ul><button onclick="location.href='guests.compact.html'">See who's coming</button>`);
page("post", `<h1>Post an event</h1>`);
page("guests", `<h1>Who's coming</h1>`);

describe("US-166: the journey walk", () => {
  // @covers US-166-AC3
  test("walks a journey by its labels, and says where one stops and why; the bar's own links are never clicked", async () => {
    const served = await serveFolder(dir);
    try {
      const r = await walkJourneys({
        url: (id) => `${served.url}${id}.compact.html`,
        journeys: [
          { id: "J-ok", steps: [{ screen: "list", label: "Open", to: "detail" }, { screen: "detail", label: "Save", to: "done" }, { screen: "done" }] },
          { id: "J-stuck", steps: [{ screen: "stuck", label: "Save", to: "done" }, { screen: "done" }] },
        ],
      });
      assert.deepEqual(r[0], { journey: "J-ok", walked: true, steps: 3, reached: 3 });
      assert.equal(r[1].walked, false);
      assert.deepEqual(r[1].stopped, { step: 1, screen: "stuck", why: 'no "Save" to click on stuck' });
    } finally { await served.stop(); }
  });

  // @covers US-167-AC2
  test("a list's first row is tried too, and a row that leads elsewhere than the journey is reported; the journey still walks", async () => {
    const served = await serveFolder(dir);
    try {
      const [r] = await walkJourneys({
        url: (id) => `${served.url}${id}.compact.html`,
        journeys: [{ id: "J-close", steps: [{ screen: "events", label: "See who's coming", to: "guests", row: true }, { screen: "guests" }] }],
      });
      assert.equal(r.walked, true);
      assert.deepEqual(r.rows, [{ step: 1, screen: "events", leadsTo: "post", expected: "guests" }]);
    } finally { await served.stop(); }
  });
});
