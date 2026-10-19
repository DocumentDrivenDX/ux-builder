import { useEffect, useId, useRef, useState } from "react";
import { Button } from "../widgets/Button.jsx";
import { ProgressBar } from "../widgets/Loading.jsx";
import { ErrorSummary } from "./Forms.jsx";
import { DescriptionList } from "./Record.jsx";

const formData = (form) => {
  if (!form) return {};
  const out = {};
  // The form's own window's FormData, so it works in any realm (an iframe, a test DOM).
  const FD = form.ownerDocument?.defaultView?.FormData ?? FormData;
  for (const [k, v] of new FD(form)) out[k] = k in out ? [].concat(out[k], v) : v;
  return out;
};

/* A task in steps: "Step 2 of 5: Title" with a step list from the medium size
   class and a progress bar below it; each step is checked before moving on;
   going back keeps every answer (all steps stay in one form); Save draft
   gives the app what has been entered; the last step is the review. A step
   is { id, title, content, validate? }: content is a node or a function of
   { data, errors } (data holds every answer so far, so a later step can show
   an earlier one instead of asking again, WCAG 3.3.7); validate(data)
   returns { field: message } for what is wrong. review(data) draws the last
   step. Fields need name attributes. */
export function Wizard({ title, steps = [], review, onSaveDraft, onFinish, saveDraftLabel = "Save draft", backLabel = "Back", nextLabel = "Continue", finishLabel = "Submit", reviewTitle = "Check your answers", className }) {
  const all = review ? [...steps, { id: "review", title: reviewTitle, content: ({ data }) => review(data) }] : steps;
  const [at, setAt] = useState(0);
  const [errors, setErrors] = useState({});
  const [attempt, setAttempt] = useState(0);
  const [data, setData] = useState({});
  const form = useRef(null), heading = useRef(null);
  const base = useId();
  const step = all[at];
  const last = at === all.length - 1;

  const read = () => formData(form.current);
  const go = (to) => { setData(read()); setErrors({}); setAt(to); requestAnimationFrame(() => heading.current?.focus()); };
  function next(e) {
    e.preventDefault();
    const now = read();
    const problems = Object.fromEntries(Object.entries(step.validate?.(now) ?? {}).filter(([, m]) => m));
    if (Object.keys(problems).length) { setData(now); setErrors(problems); setAttempt((n) => n + 1); return; }
    if (last) { onFinish?.(now); return; }
    go(at + 1);
  }
  const idOf = (name) => form.current?.elements.namedItem(name)?.id ?? name;

  return (
    <form ref={form} className={`piq-wizard${className ? ` ${className}` : ""}`} noValidate onSubmit={next}>
      {title && <p className="piq-wizard__task">{title}</p>}
      <ol className="piq-wizard__steps" aria-label="Steps">
        {all.map((s, i) => <li key={s.id} className="piq-wizard__step" aria-current={i === at ? "step" : undefined} data-done={i < at || undefined}>{s.title}</li>)}
      </ol>
      <div className="piq-wizard__progress"><ProgressBar label={`Step ${at + 1} of ${all.length}`} value={at + 1} max={all.length} valueText={`Step ${at + 1} of ${all.length}`} /></div>
      <h2 ref={heading} tabIndex={-1} className="piq-wizard__heading" id={`${base}-h`}>{`Step ${at + 1} of ${all.length}: ${step?.title ?? ""}`}</h2>
      <ErrorSummary errors={errors} idOf={idOf} attempt={attempt} />
      {all.map((s, i) => (
        <section key={s.id} className="piq-wizard__panel" hidden={i !== at} aria-labelledby={i === at ? `${base}-h` : undefined}>
          {typeof s.content === "function" ? s.content({ data, errors: i === at ? errors : {} }) : s.content}
        </section>
      ))}
      <div className="piq-wizard__actions">
        <Button type="submit" onClick={(e) => { e.preventDefault(); next(e); }}>{last ? finishLabel : nextLabel}</Button>
        {at > 0 && <Button variant="secondary" onClick={() => go(at - 1)}>{backLabel}</Button>}
        {onSaveDraft && <Button variant="text" onClick={() => onSaveDraft(read())}>{saveDraftLabel}</Button>}
      </div>
    </form>
  );
}

const STATUS = { "not-started": "Not started", "in-progress": "In progress", completed: "Completed" };

/* A long form in independent sections, done in any order: each section a
   link with its status in text, and how many are completed. sections:
   [{ id, label, href, status: not-started, in-progress or completed }]. */
export function TaskList({ title, sections = [], statusLabels = STATUS, completedText = (n, t) => `${n} of ${t} sections completed`, onSelect, className }) {
  const done = sections.filter((s) => s.status === "completed").length;
  return (
    <section className={`piq-task-list${className ? ` ${className}` : ""}`} aria-label={title}>
      {title && <h2 className="piq-task-list__title">{title}</h2>}
      <p className="piq-task-list__count">{completedText(done, sections.length)}</p>
      <ol className="piq-task-list__items">
        {sections.map((s) => (
          <li key={s.id} className="piq-task-list__item">
            <a href={s.href} onClick={(e) => { if (onSelect) { e.preventDefault(); onSelect(s.id, e); } }} aria-describedby={`${s.id}-status`}>{s.label}</a>
            <strong id={`${s.id}-status`} className="piq-task-list__status" data-status={s.status}>{statusLabels[s.status] ?? s.status}</strong>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* Answers before they are sent: grouped by section with a Change link to
   each, and what submitting will do said before the submit button (WCAG
   3.3.4). Once the app reports the result, a confirmation panel shows it
   with its reference. sections: [{ id, title, answers: [{ label, value }],
   href }]; result: { title, reference, text }. */
export function ReviewConfirm({ title = "Check your answers", sections = [], consequence, submitLabel = "Submit", onSubmit, changeLabel = "Change", result, className }) {
  const panel = useRef(null);
  useEffect(() => { if (result) panel.current?.focus(); }, [result]);
  if (result) {
    return (
      <div ref={panel} tabIndex={-1} className={`piq-confirmation${className ? ` ${className}` : ""}`} role="status">
        <h2 className="piq-confirmation__title">{result.title}</h2>
        {result.reference && <p className="piq-confirmation__reference">Reference <strong>{result.reference}</strong></p>}
        {result.text && <p className="piq-confirmation__text">{result.text}</p>}
      </div>
    );
  }
  return (
    <div className={`piq-review${className ? ` ${className}` : ""}`}>
      <h2 className="piq-review__title">{title}</h2>
      {sections.map((s) => (
        <section key={s.id} className="piq-review__section" aria-labelledby={`${s.id}-review`}>
          <div className="piq-review__head">
            <h3 id={`${s.id}-review`} className="piq-review__section-title">{s.title}</h3>
            <a href={s.href} className="piq-review__change">{changeLabel}<span className="piq-visually-hidden"> {s.title}</span></a>
          </div>
          <DescriptionList items={s.answers} />
        </section>
      ))}
      {consequence && <p className="piq-review__consequence">{consequence}</p>}
      <Button onClick={() => onSubmit?.()}>{submitLabel}</Button>
    </div>
  );
}
