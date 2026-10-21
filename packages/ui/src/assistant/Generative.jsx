import { useId, useState } from "react";
import { Button } from "../widgets/Button.jsx";
import { Card } from "../widgets/Card.jsx";
import { Checkbox } from "../widgets/Choice.jsx";
import { DataTable } from "../widgets/DataTable.jsx";
import { Select, TextField } from "../widgets/Field.jsx";
import { ProgressBar } from "../widgets/Loading.jsx";
import { Notice } from "../widgets/Notice.jsx";
import { StatusPill } from "../widgets/StatusPill.jsx";
import { FormPage, FormSection } from "../patterns/Forms.jsx";
import { DescriptionList } from "../patterns/Record.jsx";
import { StatTile } from "../patterns/Reporting.jsx";
import { Wizard } from "../patterns/Workflow.jsx";
import { checkRenderable } from "./schema.js";

const shown = (v) => (typeof v === "boolean" ? (v ? "Yes" : "No") : v === "" || v == null ? "—" : String(v));
const shownField = (f, v) => shown(f.type === "select" ? f.options?.find((o) => o.value === v)?.label ?? v : v);

/* A field's value as it starts: the user's edit, else the assistant's
   pre-fill, else empty. */
const initialOf = (fields, values) => Object.fromEntries(fields.map((f) => [f.name, values?.[f.name] ?? f.value ?? (f.type === "checkbox" ? false : "")]));

/* What is missing from the required fields: { name: message }. */
const missing = (fields, current) => Object.fromEntries(fields.filter((f) => f.required && (f.type === "checkbox" ? !current[f.name] : String(current[f.name] ?? "").trim() === ""))
  .map((f) => [f.name, f.type === "select" ? `Choose ${f.label}` : f.type === "checkbox" ? `Confirm ${f.label}` : `Enter ${f.label}`]));

/* One field from its JSON description, as the SDK's own widget. */
function FieldInput({ field: f, value, onChange, error, id }) {
  const common = { label: f.label, name: f.name, required: f.required || undefined, id };
  if (f.type === "checkbox") return <Checkbox {...common} checked={Boolean(value)} aria-invalid={error ? true : undefined} onChange={(e) => onChange(e.target.checked)} />;
  if (f.type === "select") return <Select {...common} error={error} options={f.options ?? []} value={String(value)} onChange={(e) => onChange(e.target.value)} placeholder="Choose…" />;
  return <TextField {...common} error={error} type={f.type === "number" || f.type === "date" ? f.type : "text"} value={String(value)} onChange={(e) => onChange(e.target.value)} />;
}

/* What a submitted inline form sent, read only, in groups (a wizard's steps,
   a form page's sections). */
function Submitted({ title, groups, sent, current, className }) {
  const id = useId();
  return (
    <section className={`piq-inline-form${className ? ` ${className}` : ""}`} data-submitted="" aria-labelledby={title ? `${id}-t` : undefined} aria-label={title ? undefined : "Submitted form"}>
      {title && <p id={`${id}-t`} className="piq-inline-form__title">{title}</p>}
      {groups.map((g, i) => (
        <div key={g.key ?? i} className="piq-inline-form__group">
          {g.title && <p className="piq-inline-form__group-title">{g.title}</p>}
          <DescriptionList items={g.fields.map((f) => ({ key: f.name, label: f.label, value: shownField(f, sent[f.name] ?? current[f.name]) }))} />
        </div>
      ))}
      <p className="piq-inline-form__status">Submitted</p>
    </section>
  );
}

/* A short form the assistant asks the user to fill in, inside the
   conversation: its values may be pre-filled, stay editable, and are sent
   only when the user submits. Once submitted it shows what was sent, read
   only. fields: [{ name, label, type: text, number, date, select or
   checkbox, options?, value?, required? }]. */
export function InlineForm({ title, fields = [], submitLabel = "Submit", values, onValuesChange, onSubmit, submitted, className }) {
  const id = useId();
  const current = initialOf(fields, values);
  if (submitted) return <Submitted title={title} groups={[{ fields }]} sent={submitted} current={current} className={className} />;
  const set = (name, v) => onValuesChange?.({ ...(values ?? {}), [name]: v });
  return (
    <form className={`piq-inline-form${className ? ` ${className}` : ""}`} aria-labelledby={title ? `${id}-t` : undefined} aria-label={title ? undefined : "Form"}
      onSubmit={(e) => { e.preventDefault(); onSubmit?.(current); }}>
      {title && <p id={`${id}-t`} className="piq-inline-form__title">{title}</p>}
      {fields.map((f) => <FieldInput key={f.name} field={f} value={current[f.name]} onChange={(v) => set(f.name, v)} />)}
      <div className="piq-inline-form__actions"><Button type="submit">{submitLabel}</Button></div>
    </form>
  );
}

/* A task in steps the assistant asks the user to go through, inside the
   conversation: the SDK's Wizard, with each step's fields as the SDK's
   widgets. Pre-filled values stay editable, a step's required fields are
   checked before Continue, and the values are sent only when the user
   submits on the last step. Once submitted it shows what was sent, step by
   step, read only. steps: [{ id, title, fields }], field names unique
   across steps. */
export function InlineWizard({ title, steps = [], submitLabel = "Submit", values, onValuesChange, onSubmit, submitted, className }) {
  const all = steps.flatMap((s) => s.fields);
  const current = initialOf(all, values);
  if (submitted) return <Submitted title={title} groups={steps.map((s) => ({ key: s.id, title: s.title, fields: s.fields }))} sent={submitted} current={current} className={className} />;
  const set = (name, v) => onValuesChange?.({ ...(values ?? {}), [name]: v });
  return (
    <Wizard title={title} finishLabel={submitLabel} className={className} onFinish={() => onSubmit?.(current)}
      steps={steps.map((s) => ({
        id: s.id, title: s.title,
        validate: () => missing(s.fields, current),
        content: ({ errors }) => <div className="piq-form-section__fields">{s.fields.map((f) => <FieldInput key={f.name} field={f} value={current[f.name]} error={errors[f.name]} onChange={(v) => set(f.name, v)} />)}</div>,
      }))} />
  );
}

/* A longer form the assistant asks the user to fill in, inside the
   conversation: the SDK's FormPage, its sections as FormSections of the
   SDK's widgets, with its error summary and its actions in view. Pre-filled
   values stay editable and are sent only when the user submits. Once
   submitted it shows what was sent, section by section, read only.
   sections: [{ title, fields }], field names unique across sections. */
export function InlineFormPage({ title, sections = [], submitLabel = "Submit", values, onValuesChange, onSubmit, submitted, className }) {
  const base = useId();
  const [attempt, setAttempt] = useState(0);
  const all = sections.flatMap((s) => s.fields);
  const current = initialOf(all, values);
  if (submitted) return <Submitted title={title} groups={sections.map((s) => ({ title: s.title, fields: s.fields }))} sent={submitted} current={current} className={className} />;
  const set = (name, v) => onValuesChange?.({ ...(values ?? {}), [name]: v });
  const errors = missing(all, current);
  const shownErrors = attempt ? errors : {};
  const idOf = (name) => `${base}-${name}`;
  const form = {
    submit: (e) => { e?.preventDefault?.(); setAttempt((n) => n + 1); if (!Object.keys(errors).length) onSubmit?.(current); },
    shownErrors, idOf, attempt, busy: false, dirty: Object.keys(values ?? {}).length > 0,
  };
  return (
    <FormPage title={title} form={form} submitLabel={submitLabel} className={className}>
      {sections.map((s, i) => (
        <FormSection key={i} title={s.title}>
          {s.fields.map((f) => <FieldInput key={f.name} field={f} id={idOf(f.name)} value={current[f.name]} error={shownErrors[f.name]} onChange={(v) => set(f.name, v)} />)}
        </FormSection>
      ))}
    </FormPage>
  );
}

/* Each renderable component from its JSON props. Only these are drawn. */
const RENDER = {
  DataTable: (p) => {
    const key = p.rowKey ?? "id";
    const keyed = p.rows.every((r) => r[key] != null) && new Set(p.rows.map((r) => r[key])).size === p.rows.length;
    return <DataTable columns={p.columns} rows={keyed ? p.rows : p.rows.map((r, i) => ({ ...r, "piq:row": i }))} rowKey={keyed ? key : "piq:row"} caption={p.caption} pageSize={p.pageSize} />;
  },
  Card: (p) => <Card title={p.title} as="div">{p.body}</Card>,
  Notice: (p) => <Notice tone={p.tone} title={p.title}>{p.body}</Notice>,
  StatusPill: (p) => <StatusPill state={p.state}>{p.label}</StatusPill>,
  ProgressBar: (p) => <ProgressBar label={p.label} value={p.value} max={p.max} showValue={p.showValue} />,
  DescriptionList: (p) => <DescriptionList items={p.items.map((it) => ({ ...it, value: String(it.value) }))} />,
  StatTile: (p) => <StatTile label={p.label} value={String(p.value)} change={p.change} />,
  InlineForm: (p, io) => <InlineForm title={p.title} fields={p.fields} submitLabel={p.submitLabel} {...io} />,
  Wizard: (p, io) => <InlineWizard title={p.title} steps={p.steps} submitLabel={p.submitLabel} {...io} />,
  FormPage: (p, io) => <InlineFormPage title={p.title} sections={p.sections} submitLabel={p.submitLabel} {...io} />,
};
export const RENDERERS = Object.keys(RENDER);

/* What an agent asked to render, as the SDK component it names, in the app's
   theme: only a renderable component, and only with props that pass its
   schema. Anything else is a plain notice; nothing from it is inserted as
   HTML. values, onValuesChange, onSubmit and submitted pass to an inline
   form, wizard or form page. */
export function GenerativeComponent({ component, props, values, onValuesChange, onSubmit, submitted, fallback = "This content could not be shown.", className }) {
  const { ok } = checkRenderable(component, props);
  const draw = ok && Object.hasOwn(RENDER, component) ? RENDER[component] : null;
  return (
    <div className={`piq-generative${className ? ` ${className}` : ""}`} data-piq-ai="generated" data-component={draw ? component : undefined}>
      {draw ? draw(props ?? {}, { values, onValuesChange, onSubmit, submitted }) : <p className="piq-generative__fallback">{fallback}</p>}
    </div>
  );
}
