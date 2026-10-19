import { useState } from "react";
import { Button } from "../widgets/Button.jsx";
import { Checkbox } from "../widgets/Choice.jsx";
import { CollectionList } from "./CollectionList.jsx";
import { FilterSection } from "./Regions.jsx";

/* The collection list (US-025). Resize the canvas: stacked items below 600px,
   a table of the priority columns to 840px, then every column. */
export default { title: "Patterns/Collection list", component: CollectionList, parameters: { layout: "padded" } };

const COLUMNS = [
  { key: "name", label: "Matter", priority: true, sortable: true },
  { key: "client", label: "Client", priority: true },
  { key: "owner", label: "Owner" },
  { key: "value", label: "Value", numeric: true, sortable: true },
];
const ALL = Array.from({ length: 312 }, (_, i) => ({ id: `m${i + 1}`, name: `Matter ${i + 1}`, client: ["Acme", "Globex", "Initech"][i % 3], owner: ["R. Lee", "S. Patel"][i % 2], value: 1000 + i * 7 }));

function Demo({ status = "ready" }) {
  const [selected, setSelected] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const rows = ALL.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()) && (!open || r.client === "Acme"));
  const shown = rows.slice((page - 1) * pageSize, page * pageSize);
  return (
    <CollectionList title="Matters" actions={<Button>New matter</Button>} overflow={[{ label: "Export" }]}
      columns={COLUMNS} rows={shown} status={status === "ready" && !rows.length ? "empty" : status} onRetry={() => {}}
      search={q} onSearchChange={(v) => { setQ(v); setPage(1); }}
      filters={open ? [{ id: "acme", label: "Client: Acme" }] : []} onRemoveFilter={() => setOpen(false)} onClearFilters={() => setOpen(false)}
      filterPanel={<FilterSection title="Client" count={3}><Checkbox label="Acme" checked={open} onChange={(e) => setOpen(e.target.checked)} /></FilterSection>}
      selectable selected={selected} onSelectedChange={setSelected}
      bulkActions={[<Button key="a" variant="secondary">Assign</Button>, <Button key="b" variant="secondary">Archive</Button>]}
      rowActions={() => [{ label: "Open" }, { label: "Duplicate" }, { label: "Archive" }]}
      page={page} pageSize={pageSize} total={rows.length} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1); }} />
  );
}
export const Ready = { render: () => <Demo /> };
export const Loading = { render: () => <Demo status="loading" /> };
export const Failed = { render: () => <Demo status="error" /> };
export const NoAccess = { render: () => <Demo status="forbidden" /> };
