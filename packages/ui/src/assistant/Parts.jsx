import { useEffect, useId, useRef } from "react";
import { Button } from "../widgets/Button.jsx";
import { Icon } from "../icons/Icon.jsx";

/* The parts of an assistant's reply that show its work: reasoning, tool
   calls, sources and approvals. Every one states its state in text. */

const seconds = (n) => (n == null ? null : `${Math.max(1, Math.round(n))} second${Math.round(n) === 1 ? "" : "s"}`);

/* What the assistant reasoned, collapsed behind a disclosure that says for how
   long; the answer never depends on opening it. */
export function Reasoning({ text, seconds: s, className }) {
  return (
    <details className={`piq-reasoning${className ? ` ${className}` : ""}`}>
      <summary className="piq-reasoning__summary">{s != null ? `Reasoned for ${seconds(s)}` : "Reasoning"}</summary>
      <p className="piq-reasoning__text">{String(text ?? "")}</p>
    </details>
  );
}

const STATUS = { running: "Running", done: "Done", failed: "Failed" };
const json = (v) => (typeof v === "string" ? v : JSON.stringify(v, null, 2));

/* One tool the assistant used: its name and status (running, done, failed) in
   text, and on request its input and result. It is a step of the reply's plan. */
export function ToolCall({ name, title, status = "running", input, output, error, className }) {
  const label = title ?? name;
  return (
    <li className={`piq-tool-call${className ? ` ${className}` : ""}`} data-piq-ai="step" data-piq-ai-status={status} data-status={status}>
      <p className="piq-tool-call__line">
        <Icon name={status === "done" ? "check-circle" : status === "failed" ? "error" : "refresh"} className="piq-tool-call__mark" />
        <span className="piq-tool-call__name">{label}</span>
        <span className="piq-tool-call__status">{STATUS[status] ?? status}</span>
      </p>
      {status === "failed" && error && <p className="piq-tool-call__error">{String(error)}</p>}
      {(input !== undefined || output !== undefined) && (
        <details className="piq-tool-call__details">
          <summary>Show input and result</summary>
          {input !== undefined && <><p className="piq-tool-call__label">Input</p><pre className="piq-tool-call__data" tabIndex={0}>{json(input)}</pre></>}
          {output !== undefined && <><p className="piq-tool-call__label">Result</p><pre className="piq-tool-call__data" tabIndex={0}>{json(output)}</pre></>}
        </details>
      )}
    </li>
  );
}

/* A reply's tool calls as one plan; more than three are grouped under "Used n tools". */
export function ToolCalls({ calls = [] }) {
  const list = (
    <ol className="piq-tool-calls" data-piq-ai="plan" aria-label="Tools used">
      {calls.map((c, i) => <ToolCall key={c.id ?? i} name={c.name} title={c.title} status={c.status} input={c.input} output={c.output} error={c.error} />)}
    </ol>
  );
  if (calls.length <= 3) return list;
  const running = calls.filter((c) => c.status === "running").length, failed = calls.filter((c) => c.status === "failed").length;
  return (
    <details className="piq-tool-group">
      <summary>{`Used ${calls.length} tools`}{running ? ` · ${running} running` : ""}{failed ? ` · ${failed} failed` : ""}</summary>
      {list}
    </details>
  );
}

/* The sources a reply relies on, numbered; each title is a link where it has
   one, leaving the app. Each item can take focus, so a citation [n] in the
   answer moves to it. */
export function Sources({ sources = [], idPrefix, label = "Sources", className }) {
  const auto = useId();
  const prefix = idPrefix ?? auto;
  return (
    <section className={`piq-sources${className ? ` ${className}` : ""}`} aria-labelledby={`${prefix}-h`}>
      <p id={`${prefix}-h`} className="piq-sources__title">{label}</p>
      <ol className="piq-sources__list">
        {sources.map((s, i) => (
          <li key={s.id ?? i} id={`${prefix}-${i + 1}`} tabIndex={-1} className="piq-sources__item">
            {s.href && /^(https?:|mailto:)/i.test(s.href)
              ? <a className="piq-markdown__link" href={s.href} target="_blank" rel="noopener noreferrer">{s.title}<Icon name="external-link" className="piq-markdown__leaves" /><span className="piq-visually-hidden"> (opens in a new tab)</span></a>
              : <span>{s.title}</span>}
          </li>
        ))}
      </ol>
    </section>
  );
}

const DECIDED = { approved: "Approved by you", denied: "Denied by you" };

/* A request for the user's approval before the assistant changes anything:
   what will happen and to what, with Approve and Deny. Nothing is passed on
   until the user chooses, neither button is chosen or focused for them, and
   once decided, or no longer current, it has no buttons and says why. */
export function ApprovalCard({ summary, details, decision, current = true, onDecide, approveLabel = "Approve", denyLabel = "Deny", className }) {
  const id = useId();
  const status = useRef(null);
  const state = decision ? decision : current ? "pending" : "stale";
  // Once the user has chosen, focus moves to the recorded choice, since the buttons are gone.
  const chosen = useRef(false);
  const choose = (d) => { chosen.current = true; onDecide?.(d); };
  useEffect(() => { if (chosen.current && state !== "pending") { chosen.current = false; status.current?.focus(); } }, [state]);
  return (
    <section className={`piq-approval${className ? ` ${className}` : ""}`} data-piq-ai="approval" data-state={state} aria-labelledby={`${id}-t`}>
      <p className="piq-approval__eyebrow"><Icon name="lock" />Needs your approval</p>
      <p id={`${id}-t`} className="piq-approval__summary">{summary}</p>
      {details && <p className="piq-approval__details">{details}</p>}
      {state === "pending" ? (
        <div className="piq-approval__actions">
          <Button variant="primary" data-piq-ai-control="approve" onClick={() => choose("approved")}>{approveLabel}</Button>
          <Button variant="secondary" data-piq-ai-control="deny" onClick={() => choose("denied")}>{denyLabel}</Button>
        </div>
      ) : (
        <p ref={status} tabIndex={-1} className="piq-approval__status">
          <Icon name={state === "approved" ? "check-circle" : state === "denied" ? "close" : "info"} />
          {DECIDED[state] ?? "This request is no longer current."}
        </p>
      )}
    </section>
  );
}
