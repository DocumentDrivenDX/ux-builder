import { useState } from "react";
import { Button, Card, ChoicePicker, DataTable, Icon, Logo, Notice, Select, StatusPill, TextField, useTheme, useToast } from "@ux-builder/ui";

const MATTERS = [
  { id: 1, matter: "Halvorsen v. Atlas", partner: "R. Okafor", hours: 12.4, state: "live" },
  { id: 2, matter: "Okafor estate", partner: "M. Chen", hours: 7.75, state: "limited" },
  { id: 3, matter: "Brightwater merger", partner: "A. Patel", hours: 3.1, state: "closed" },
];
const COLUMNS = [
  { key: "matter", label: "Matter", sortable: true },
  { key: "partner", label: "Partner", sortable: true },
  { key: "hours", label: "Hours", numeric: true, sortable: true },
  { key: "state", label: "Status", render: (r) => <StatusPill state={r.state} /> },
];
const APPEARANCES = [{ value: "system", label: "System" }, { value: "light", label: "Light" }, { value: "dark", label: "Dark" }];

export function App() {
  const { theme, preference, themes, setTheme, setAppearance } = useTheme();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  // Stands in for a request: the button is busy until it answers.
  const add = () => { setAdding(true); setTimeout(() => { setAdding(false); toast.show({ message: "Matter added.", actionLabel: "Undo" }); }, 600); };
  const rows = MATTERS.filter((m) => m.matter.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="page">
      <header className="masthead">
        <div className="brand">
          <Logo />
          <h1>__APP_NAME__</h1>
        </div>
        <div className="switcher">
          <Select label="Theme" value={theme} onChange={(e) => setTheme(e.target.value)} options={themes.map((t) => ({ value: t.name, label: t.title }))} />
          <ChoicePicker label="Appearance" options={APPEARANCES} value={preference} onChange={setAppearance} />
        </div>
      </header>
      <main className="content">
        <Notice tone="info" title="You are on the SDK">Change the theme above: the logo, every widget and every colour follow, with no change to the app.</Notice>
        <Card title="Matters" actions={<Button busy={adding} onClick={add}><Icon name="add" /> Add matter</Button>}>
          <div className="stack">
            <TextField label="Search" placeholder="Matter name" value={query} onChange={(e) => setQuery(e.target.value)} />
            <DataTable columns={COLUMNS} rows={rows} caption="Matters" />
          </div>
        </Card>
      </main>
    </div>
  );
}
