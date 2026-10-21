import { useId } from "react";
import { Button } from "../widgets/Button.jsx";
import { Card } from "../widgets/Card.jsx";
import { Checkbox } from "../widgets/Choice.jsx";
import { DataTable } from "../widgets/DataTable.jsx";
import { Select, TextField } from "../widgets/Field.jsx";
import { ProgressBar } from "../widgets/Loading.jsx";
import { Notice } from "../widgets/Notice.jsx";
import { StatusPill } from "../widgets/StatusPill.jsx";
import { DescriptionList } from "../patterns/Record.jsx";
import { StatTile } from "../patterns/Reporting.jsx";
import { checkRenderable } from "./schema.js";

const shown = (v) => (typeof v === "boolean" ? (v ? "Yes" : "No") : v === "" || v == null ? "—" : String(v));

/* A short form the assistant asks the user to fill in, inside the
   conversation: its values may be pre-filled, stay editable, and are sent
   only when the user submits. Once submitted it shows what was sent, read
   only. fields: [{ name, label, type: text, number, date, select or
   checkbox, options?, value?, required? }]. */
export function InlineForm({ title, fields = [], submitLabel = "Submit", values, onValuesChange, onSubmit, submitted, className }) {
  const id = useId();
  const current = Object.fromEntries(fields.map((f) => [f.name, values?.[f.name] ?? f.value ?? (f.type === "checkbox" ? false : "")]));
  if (submitted) {
    return (
      <section className={`piq-inline-form${className ? ` ${className}` : ""}`} data-submitted="" aria-labelledby={title ? `${id}-t` : undefined} aria-label={title ? undefined : "Submitted form"}>
        {title && <p id={`${id}-t`} className="piq-inline-form__title">{title}</p>}
        <DescriptionList items={fields.map((f) => ({ key: f.name, label: f.label, value: shown(submitted[f.name] ?? current[f.name]) }))} />
        <p className="piq-inline-form__status">Submitted</p>
      </section>
    );
  }
  const set = (name, v) => onValuesChange?.({ ...(values ?? {}), [name]: v });
  return (
    <form className={`piq-inline-form${className ? ` ${className}` : ""}`} aria-labelledby={title ? `${id}-t` : undefined} aria-label={title ? undefined : "Form"}
      onSubmit={(e) => { e.preventDefault(); onSubmit?.(current); }}>
      {title && <p id={`${id}-t`} className="piq-inline-form__title">{title}</p>}
      {fields.map((f) => {
        const common = { label: f.label, name: f.name, required: f.required || undefined };
        if (f.type === "checkbox") return <Checkbox key={f.name} {...common} checked={Boolean(current[f.name])} onChange={(e) => set(f.name, e.target.checked)} />;
        if (f.type === "select") return <Select key={f.name} {...common} options={f.options ?? []} value={String(current[f.name])} onChange={(e) => set(f.name, e.target.value)} placeholder="Choose…" />;
        return <TextField key={f.name} {...common} type={f.type === "number" || f.type === "date" ? f.type : "text"} value={String(current[f.name])} onChange={(e) => set(f.name, e.target.value)} />;
      })}
      <div className="piq-inline-form__actions"><Button type="submit">{submitLabel}</Button></div>
    </form>
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
};
export const RENDERERS = Object.keys(RENDER);

/* What an agent asked to render, as the SDK component it names, in the app's
   theme: only a renderable component, and only with props that pass its
   schema. Anything else is a plain notice; nothing from it is inserted as
   HTML. values, onValuesChange, onSubmit and submitted pass to an inline form. */
export function GenerativeComponent({ component, props, values, onValuesChange, onSubmit, submitted, fallback = "This content could not be shown.", className }) {
  const { ok } = checkRenderable(component, props);
  const draw = ok && Object.hasOwn(RENDER, component) ? RENDER[component] : null;
  return (
    <div className={`piq-generative${className ? ` ${className}` : ""}`} data-piq-ai="generated" data-component={draw ? component : undefined}>
      {draw ? draw(props ?? {}, { values, onValuesChange, onSubmit, submitted }) : <p className="piq-generative__fallback">{fallback}</p>}
    </div>
  );
}
