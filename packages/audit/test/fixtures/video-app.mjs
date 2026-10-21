/* A small app to record walkthrough videos of, with a run package whose
   walkthrough, checkpoints and findings point at it (FEAT-013 tests):
   /queue and /entry/1 need a session cookie (else /login); /modal opens a
   modal dialog; /hostile removes the video's mask layer.

     const app = await videoApp(); … app.close(); */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { validate } from "../../assess/manifest.mjs";
import { video } from "../../assess/video.mjs";
import { prepared } from "./run-package.mjs";

const page = (title, body, script = "") => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title><style>body{font:16px system-ui;margin:24px}button{font:inherit;padding:8px 16px;margin-right:8px}</style></head><body><main>${body}</main>${script ? `<script>${script}</script>` : ""}</body></html>`;
export const signedIn = () => JSON.stringify({ cookies: [{ name: "session", value: "reviewer", domain: "127.0.0.1", path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" }], origins: [] });
export const plain = { problem: "Approve and Reject look equally important, so it is easy to reject by mistake.", recommendation: "Make Approve the one main action, and confirm before Reject." };

export async function videoApp() {
  const hits = [];
  const state = { resets: 0 };
  const server = createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    const session = /(?:^|;\s*)session=reviewer/.test(req.headers.cookie ?? "");
    hits.push({ path: url.pathname, session });
    const html = (b) => { res.writeHead(200, { "content-type": "text/html" }); res.end(b); };
    if (url.pathname === "/__reset") { state.resets++; res.end("ok"); return; }
    if (url.pathname === "/login") return html(page("Sign in", `<h1>Sign in</h1><label>Password <input type="password" value="hunter2"></label>`));
    if (["/queue", "/entry/1"].includes(url.pathname) && !session && !url.searchParams.has("guest")) { res.writeHead(302, { location: "/login" }); res.end(); return; }
    if (url.pathname === "/queue") return html(page("Queue", `<h1>Queue</h1><p>Signed in as <span class="customer-email">ann@example.test</span></p><p id="acct">Account 4417-2210 is flagged</p><ul><li><a href="/entry/1">Entry 1</a></li></ul>`, `setTimeout(() => { const p = document.createElement("p"); p.className = "customer-email"; p.textContent = "late@example.test"; document.querySelector("main").append(p); }, 300);`));
    if (url.pathname === "/entry/1") return html(page("Entry 1", `<h1>Entry 1</h1><button id="approve">Approve</button><button id="reject">Reject</button><dialog id="why"><label>Reason <input id="reason"></label><button id="confirm">Confirm reject</button></dialog>`, `document.getElementById("reject").onclick = () => why.showModal(); document.getElementById("confirm").onclick = () => { why.close(); document.querySelector("h1").textContent = "Rejected"; };`));
    if (url.pathname === "/modal") return html(page("Modal", `<h1>Modal</h1><dialog id="m"><p class="customer-email">in-a-modal@example.test</p></dialog>`, `m.showModal();`));
    if (url.pathname === "/hostile") return html(page("Hostile", `<h1>Hostile</h1>`, `window.__piqVideo = undefined;`));
    res.writeHead(404); res.end();
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const made = [];

  function pkg({ role = { id: "reviewer", auth: { storageState: "reviewer.json" } }, video: v } = {}) {
    const p = prepared({
      files: { "reviewer.json": signedIn() },
      manifest: {
        run: { baseUrl: `${base}/`, environment: "local" },
        roles: [role],
        fixtures: [{ id: "queue", reset: `node -e "fetch('${base}/__reset')"` }],
        evidence: { redact: { selectors: [".customer-email"], text: ["\\d{4}-\\d{4}"] } },
        restrictions: { writes: "report-only", allow: ["edit-test-data"] },
        ...(v ? { video: v } : {}),
      },
    });
    made.push(p);
    return p;
  }
  const ready = (p) => { const m = { file: join(p.r.dir, "ux-assessment.yml"), dir: p.r.dir }; const { resolved, problems } = validate({ ...m, data: parseYaml(readFileSync(m.file, "utf8")) }); assert.deepEqual(problems, []); return { manifest: m, resolved }; };
  function walked(p, { undoSteps } = {}) {
    p.checkpointAt("C-review-1");
    p.checkpointAt("C-review-2");
    p.checkpointAt("C-undo-1");
    const obs = { text: "seen", basis: ["screenshot"], visual: true };
    p.write("walkthrough.json", { schema: "walkthrough", version: 1, journeys: [
      { id: "J-review", status: "completed", steps: [
        { n: 1, action: "Open the queue", status: "done", url: "/queue", checkpoint: "C-review-1", observation: obs, do: { goto: "/queue" } },
        { n: 2, action: "Open entry 1", status: "done", url: "/entry/1", checkpoint: "C-review-2", observation: obs, do: { click: "role=link[name='Entry 1']" } },
        { n: 3, action: "Reject it", status: "done", alternate: 1, do: { goto: "/entry/1" } },
        { n: 4, action: "Open the reason", status: "done", alternate: 1, do: { click: "#reject" } },
        { n: 5, action: "Give a reason", status: "done", alternate: 1, do: { fill: "#reason", value: "Duplicate" } },
        { n: 6, action: "Confirm", status: "done", alternate: 1, do: { click: "#confirm", action: "edit-test-data" } },
      ] },
      { id: "J-undo", status: "partial", steps: undoSteps ?? [
        { n: 1, action: "Open the queue", status: "done", url: "/queue", checkpoint: "C-undo-1", observation: obs, do: { goto: "/queue" } },
        { n: 2, action: "Press Undo", status: "done", do: { click: "#undo-that-is-gone" } },
        { n: 3, action: "See the queue again", status: "done", url: "/queue", checkpoint: "C-undo-1", observation: obs, do: { goto: "/queue" } },
      ] },
    ] });
    const both = p.finding({ title: "Approve and Reject look the same", key: "same", priority: "P1", plain, elements: ["#approve", "#reject"], evidence_refs: ["checkpoints/C-review-2/screenshot.png"] });
    const judged = p.finding({ title: "The queue does not say what to do first", key: "first", finding_type: "heuristic", source_refs: [], priority: "P3", confidence: { level: "low", reason: "one reviewer's view" }, expected_behavior_or_proposed_requirement: "Proposed criterion: Given a queue, when it opens, then the next entry to review is marked.", plain: { problem: "Nothing says which entry to review first.", recommendation: "Mark the next entry to review." }, evidence_refs: ["checkpoints/C-review-1/screenshot.png"] });
    const later = p.finding({ title: "Undo is hard to find", key: "undo", journey_id: "J-undo", priority: "P2", plain: { problem: "Undo is hard to find after approving.", recommendation: "Offer Undo right where the entry was." }, evidence_refs: ["checkpoints/C-undo-1/screenshot.png"] });
    p.write("backlog.json", { schema: "backlog", version: 1, findings: [both, judged, later], user_validation: [] });
    return { both, judged, later };
  }
  const run = (p, o = {}) => video({ ...ready(p), run: p.run, pace: 0.08, ...o });
  return { base, hits, state, pkg, ready, walked, run, close: () => { server.close(); for (const p of made) p.remove(); } };
}
