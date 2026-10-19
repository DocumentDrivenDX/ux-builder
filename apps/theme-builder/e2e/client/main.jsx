/* A client app that adopts a theme the builder generated, the way "Use in
   your app" tells a developer to: the theme's CSS and fonts from
   @ux-builder/tokens, the widgets from @ux-builder/ui, and ThemeProvider. Nothing
   here is styled by hand. The theme's name arrives as __THEME__. */

import "@ux-builder/tokens/themes/__THEME__.css";
import "@ux-builder/tokens/fonts/__THEME__.css";
import "@ux-builder/ui/ui.css";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Button, Card, Checkbox, ChoicePicker, DataTable, Icon, Notice, RadioGroup, Select, StatusPill, Switch, TextArea, TextField,
  ThemeProvider, ToastProvider, useTheme, useToast,
} from "@ux-builder/ui";

const THEME = __THEME__;
const ROWS = [
  { id: 1, matter: "Halvorsen v. Atlas", hours: 12.4, state: "live" },
  { id: 2, matter: "Okafor estate", hours: 7.75, state: "limited" },
  { id: 3, matter: "Brightwater merger", hours: 3.1, state: "closed" },
];
const COLUMNS = [
  { key: "matter", label: "Matter", sortable: true },
  { key: "hours", label: "Hours", numeric: true, sortable: true },
  { key: "state", label: "Status", render: (r) => <StatusPill state={r.state} /> },
];

function Page() {
  const { theme, appearance, setAppearance } = useTheme();
  const toast = useToast();
  const [view, setView] = useState("matters");
  return (
    <main data-testid="page" style={{ display: "grid", gap: "var(--piq-space-4)", padding: "var(--piq-space-5)", minHeight: "100vh", background: "var(--piq-color-ground)", color: "var(--piq-color-text)", fontFamily: "var(--piq-font-body)" }}>
      <header style={{ display: "flex", gap: "var(--piq-space-3)", alignItems: "center", justifyContent: "space-between" }}>
        <span data-testid="logo" role="img" aria-label="Logo" style={{ display: "inline-block", width: 48, height: 48, backgroundImage: "var(--piq-brand-logo-image)", backgroundSize: "contain", backgroundRepeat: "no-repeat" }} />
        <h1 data-testid="heading" style={{ margin: 0, fontFamily: "var(--piq-font-heading)", color: "var(--piq-color-text-strong)" }}>Matters</h1>
        <span data-testid="state">{theme} · {appearance}</span>
        <Button variant="secondary" onClick={() => setAppearance(appearance === "dark" ? "light" : "dark")}>Switch to {appearance === "dark" ? "light" : "dark"}</Button>
      </header>
      <p data-testid="body-text">Body text in the theme's body face, on the page ground.</p>
      <p data-testid="muted-text" style={{ color: "var(--piq-color-text-muted)" }}>Muted text for hints.</p>
      <div data-testid="icons" style={{ display: "flex", gap: "var(--piq-space-3)" }}>
        {["search", "warning", "check-circle", "download", "calendar", "settings"].map((n) => <Icon key={n} name={n} />)}
      </div>
      <Card title="Five entries need a look" actions={<><Button data-testid="primary" onClick={() => toast.show({ message: "Entry moved to review.", actionLabel: "Undo" })}>Confirm</Button><Button variant="secondary">Expand</Button><Button variant="text" badge={5}>Pinned</Button></>}>
        Two of them are block-billed.
      </Card>
      <ChoicePicker label="View" options={[{ value: "matters", label: "Matters" }, { value: "time", label: "Time" }]} value={view} onChange={setView} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--piq-space-3)" }}>
        <TextField label="Client" placeholder="Search clients" />
        <Select label="Matter" options={[{ value: "1", label: "Halvorsen v. Atlas" }, { value: "2", label: "Okafor estate" }]} defaultValue="1" />
      </div>
      <TextArea label="Narrative" defaultValue="Reviewed the draft agreement." />
      <div style={{ display: "flex", gap: "var(--piq-space-4)" }}>
        <Checkbox label="Block-billed" defaultChecked /><Switch label="Notify partner" defaultChecked />
        <RadioGroup label="Bill as" options={[{ value: "h", label: "Hourly" }, { value: "f", label: "Fixed fee" }]} defaultValue="h" />
      </div>
      <Notice tone="warning" title="Two entries over the cap" />
      <Notice tone="error" title="Rate missing for one timekeeper" />
      <DataTable columns={COLUMNS} rows={ROWS} caption="Matters" />
    </main>
  );
}

createRoot(document.getElementById("root")).render(
  <ThemeProvider theme={THEME} appearance="light" data-testid="provider">
    <ToastProvider><Page /></ToastProvider>
  </ThemeProvider>,
);
