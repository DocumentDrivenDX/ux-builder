import { useState } from "react";
import { Button } from "../widgets/Button.jsx";
import { TextField } from "../widgets/Field.jsx";
import { ConfirmDialog, FormPage, FormSection, QuickEdit, useFormState } from "./Forms.jsx";

/* Forms (US-027): validation on leaving a field, an error summary on
   submit, sticky actions, quick add and a typed confirmation. */
export default { title: "Patterns/Forms", component: FormPage, parameters: { layout: "padded" } };

const validate = (v) => ({ client: v.client ? null : "Enter the client", name: v.name ? null : "Enter the matter name" });

function NewMatter() {
  const form = useFormState({ initial: { client: "", name: "", notes: "" }, validate, onSubmit: () => new Promise((r) => setTimeout(r, 600)) });
  return (
    <FormPage title="New matter" form={form} onCancel={() => {}}>
      <FormSection title="Matter">
        <TextField label="Client" {...form.field("client")} />
        <TextField label="Matter name" {...form.field("name")} />
      </FormSection>
      <TextField label="Notes" hint="Optional" {...form.field("notes")} />
    </FormPage>
  );
}
export const FullPage = { render: () => <NewMatter /> };

function Quick() {
  const [open, setOpen] = useState(false);
  const form = useFormState({ initial: { name: "" }, validate: (v) => ({ name: v.name ? null : "Enter a name" }) });
  return (<><Button onClick={() => setOpen(true)}>Quick add</Button>
    <QuickEdit open={open} onClose={() => setOpen(false)} title="Quick add" form={form}><TextField label="Name" {...form.field("name")} /></QuickEdit></>);
}
export const QuickAdd = { render: () => <Quick /> };

function Delete() {
  const [open, setOpen] = useState(false);
  return (<><Button variant="secondary" onClick={() => setOpen(true)}>Delete matter</Button>
    <ConfirmDialog open={open} onCancel={() => setOpen(false)} onConfirm={() => setOpen(false)} objectName="Acme v. Beta" requireTyping
      consequence="Its documents and billing history will be deleted for everyone. This cannot be undone." /></>);
}
export const TypedConfirmation = { render: () => <Delete /> };
