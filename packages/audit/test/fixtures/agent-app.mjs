/* A static agent app for the AI-journey tests (US-082): pages marked up
   with CONTRACT-005's AI markup, and counters of the consequential requests
   they make, so a test can show that nothing was approved or acted on.

     /agent              Run shows the plan and an approval (approve, deny) before sending
     /agent-no-approval  Send acts at once: no approval
     /agent-error        a failed step, described in place, with Retry; the request is kept
     /agent-error-bad    the failure only in a page-level alert; no retry; the request is cleared

   POST /approved and POST /acted count what the pages would have done. */

import { createServer } from "node:http";

const page = (title, body, script = "") => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title></head>
<body><main><h1>${title}</h1>
<form onsubmit="return false"><label for="req">Request</label> <textarea id="req"></textarea> <button type="button" id="run">Run</button></form>
${body}
<p id="outcome" role="status"></p>
</main><script>${script}</script></body></html>`;

const post = (path) => `fetch(${JSON.stringify(path)}, { method: "POST" })`;

const PAGES = {
  "/agent": page("Invoices agent", `
<section data-piq-ai-label aria-label="Agent">
  <p data-piq-ai="status" aria-live="polite" id="status">Idle</p>
  <ol data-piq-ai="plan" id="plan" hidden>
    <li data-piq-ai="step" data-piq-ai-status="done">Find overdue invoices (done)</li>
    <li data-piq-ai="step" data-piq-ai-status="pending">Send 3 reminders (pending)</li>
  </ol>
  <div data-piq-ai="approval" id="approval" hidden>
    <p>Send 3 payment reminders to customers?</p>
    <button type="button" id="ok" data-piq-ai-control="approve">Send</button>
    <button type="button" id="no" data-piq-ai-control="deny">Deny</button>
  </div>
  <button type="button" id="send-now">Send now</button>
</section>`, `
document.getElementById("run").onclick = () => { document.getElementById("plan").hidden = false; document.getElementById("approval").hidden = false; document.getElementById("status").textContent = "Waiting for your approval"; };
document.getElementById("ok").onclick = () => { ${post("/approved")}; document.getElementById("outcome").textContent = "Sent"; };
document.getElementById("no").onclick = () => { document.getElementById("approval").hidden = true; document.getElementById("outcome").textContent = "Denied: nothing was sent"; };
document.getElementById("send-now").onclick = () => { ${post("/acted")}; };`),
  "/agent-no-approval": page("Invoices agent", `
<section data-piq-ai-label aria-label="Agent">
  <p data-piq-ai="status" aria-live="polite">Ready</p>
  <button type="button" id="send">Send reminders</button>
</section>`, `
document.getElementById("send").onclick = () => { ${post("/acted")}; document.getElementById("outcome").textContent = "Sent"; };`),
  "/agent-error": page("Invoices agent", `
<section data-piq-ai-label aria-label="Agent">
  <p data-piq-ai="status" aria-live="polite" id="status">Idle</p>
  <ol data-piq-ai="plan" id="plan" hidden>
    <li data-piq-ai="step" data-piq-ai-status="done">Find overdue invoices (done)</li>
    <li data-piq-ai="step" data-piq-ai-status="failed">Send reminders (failed: the customer list could not be read)
      <button type="button" data-piq-ai-control="retry">Retry this step</button></li>
  </ol>
</section>`, `
document.getElementById("run").onclick = () => { document.getElementById("plan").hidden = false; document.getElementById("status").textContent = "Stopped: a step failed"; };`),
  "/agent-error-bad": page("Invoices agent", `
<div role="alert" id="toast" hidden>Something went wrong. Start again.</div>
<section data-piq-ai-label aria-label="Agent">
  <p data-piq-ai="status" aria-live="polite" id="status">Idle</p>
</section>`, `
document.getElementById("run").onclick = () => { document.getElementById("toast").hidden = false; document.getElementById("req").value = ""; document.getElementById("status").textContent = "Idle"; };`),
};

export async function agentApp() {
  const counts = { approved: 0, acted: 0 };
  const server = createServer((req, res) => {
    const path = new URL(req.url, "http://x").pathname;
    if (req.method === "POST" && path.slice(1) in counts) { counts[path.slice(1)]++; res.writeHead(204); res.end(); return; }
    if (PAGES[path]) { res.writeHead(200, { "content-type": "text/html" }); res.end(PAGES[path]); return; }
    res.writeHead(404); res.end();
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { base: `http://127.0.0.1:${server.address().port}`, counts, close: () => server.close() };
}
