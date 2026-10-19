/* A small app for the collection list's browser test (US-025-AC3): the app
   shell around a collection list with three rows selected, rendered by React
   in the page so the list's behaviour runs as it would in an app. Bundled by
   collection.browser.test.mjs. */
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { Button, Checkbox } from "../../dist/index.js";
import { AppShell, CollectionList, FilterSection } from "../../dist/patterns.js";

const COLUMNS = [
  { key: "name", label: "Matter", priority: true },
  { key: "client", label: "Client", priority: true },
  { key: "owner", label: "Owner" },
];
const ROWS = Array.from({ length: 20 }, (_, i) => ({ id: `m${i}`, name: `Matter ${i + 21}`, client: i % 2 ? "Acme" : "Globex", owner: "R. Lee" }));

function App() {
  const [selected, setSelected] = useState(["m0", "m1", "m2"]);
  return (
    <AppShell nav={[{ id: "m", label: "Matters", href: "#m", icon: "view" }]} current="m" brand={<strong>Acme</strong>}>
      <CollectionList title="Matters" columns={COLUMNS} rows={ROWS} selectable selected={selected} onSelectedChange={setSelected}
        bulkActions={[<Button key="a" variant="secondary">Assign</Button>, <Button key="b" variant="secondary">Archive</Button>]}
        rowActions={() => [{ label: "Open" }]} search="" onSearchChange={() => {}}
        filterPanel={<FilterSection title="Status"><Checkbox label="Open" /></FilterSection>}
        page={2} pageSize={20} total={312} onPageChange={() => {}} />
    </AppShell>
  );
}
createRoot(document.getElementById("root")).render(<App />);
