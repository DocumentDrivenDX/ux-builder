/* A long form and a quick edit for the forms browser test (US-027-AC5,
   AC6): the app shell around a FormPage of twelve fields, and a button that
   opens a QuickEdit. Rendered by React in the page. Bundled by
   forms.browser.test.mjs. */
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { Button, TextField } from "../../dist/index.js";
import { AppShell, FormPage, QuickEdit, useFormState } from "../../dist/patterns.js";

const NAMES = ["Client", "Matter", "Owner", "Office", "Practice", "Partner", "Budget", "Currency", "Opened", "Reference", "Court", "Judge"];

function App() {
  const form = useFormState({ initial: Object.fromEntries(NAMES.map((n) => [n, ""])) });
  const quick = useFormState({ initial: { name: "", client: "" } });
  const [open, setOpen] = useState(false);
  return (
    <AppShell nav={[{ id: "m", label: "Matters", href: "#m", icon: "view" }]} current="m" brand={<strong>Acme</strong>}
      actions={<Button id="quick" variant="secondary" onClick={() => setOpen(true)}>Quick add</Button>}>
      <FormPage title="New matter" form={form} onCancel={() => {}}>
        {NAMES.map((n) => <TextField key={n} label={n} {...form.field(n)} />)}
      </FormPage>
      <QuickEdit open={open} onClose={() => setOpen(false)} title="Quick add" form={quick}>
        <TextField label="Name" {...quick.field("name")} />
        <TextField label="Client" {...quick.field("client")} />
      </QuickEdit>
    </AppShell>
  );
}
createRoot(document.getElementById("root")).render(<App />);
