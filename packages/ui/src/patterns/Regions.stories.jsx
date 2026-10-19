import { useState } from "react";
import { Breadcrumbs } from "../widgets/Breadcrumbs.jsx";
import { Button } from "../widgets/Button.jsx";
import { Checkbox } from "../widgets/Choice.jsx";
import { StatusPill } from "../widgets/StatusPill.jsx";
import { ErrorSummary } from "./Forms.jsx";
import { BulkActionBar, FilterBar, FilterPanel, FilterSection, PageHeader, StatePanel } from "./Regions.jsx";

/* The regions screens are built from (US-025). */
export default { title: "Patterns/Regions", parameters: { layout: "padded" } };

export const Header = { render: () => <PageHeader title="Acme v. Beta" breadcrumbs={<Breadcrumbs items={[{ label: "Matters", href: "#" }, { label: "Acme v. Beta" }]} />} status={<StatusPill state="live" />} description="Commercial dispute, opened 2 October 2026."
  actions={<Button>Edit</Button>} secondaryActions={<Button variant="secondary">Share</Button>} overflow={[{ label: "Duplicate" }, { label: "Archive" }]} /> };

function FilterDemo() {
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState([{ id: "acme", label: "Client: Acme" }, { id: "open", label: "Status: Open" }]);
  const [open, setOpen] = useState(true);
  return (
    <div style={{ display: "grid", gap: "var(--piq-space-3)" }}>
      <FilterBar search={q} onSearchChange={setQ} filters={filters} onRemoveFilter={(f) => setFilters((x) => x.filter((y) => y.id !== f.id))} onClearAll={() => setFilters([])} onOpenFilters={() => setOpen((o) => !o)} filtersOpen={open} />
      <FilterPanel open={open} onClose={() => setOpen(false)}>
        <FilterSection title="Client" count={1}><Checkbox label="Acme" defaultChecked /><Checkbox label="Globex" /></FilterSection>
        <FilterSection title="Status"><Checkbox label="Open" defaultChecked /><Checkbox label="Closed" /></FilterSection>
      </FilterPanel>
    </div>
  );
}
export const Filters = { render: () => <FilterDemo /> };

export const States = { render: () => (
  <div style={{ display: "grid", gap: "var(--piq-space-4)" }}>
    <StatePanel kind="empty" title="No matters yet" action={<Button>New matter</Button>}>Matters you open appear here.</StatePanel>
    <StatePanel kind="no-results" title="No matters match" filters={[{ id: "a", label: "Client: Acme" }]} onClearFilters={() => {}} />
    <StatePanel kind="error" title="The matters did not load" onRetry={() => {}} />
  </div>
) };

function BulkDemo() { const [n, setN] = useState(3); return <BulkActionBar count={n} onClearSelection={() => setN(0)}><Button size="sm" variant="secondary">Assign</Button><Button size="sm" variant="secondary">Export</Button></BulkActionBar>; }
export const BulkActions = { render: () => <BulkDemo /> };

/* The summary takes focus when it appears, as on a real submit, so it appears on one: a story that took focus on load would move the page to it. */
function ErrorsDemo() {
  const [attempt, setAttempt] = useState(0);
  return (
    <div style={{ display: "grid", gap: "var(--piq-space-3)", justifyItems: "start" }}>
      {attempt > 0 && <ErrorSummary attempt={attempt} errors={{ name: "Enter the matter name", rate: "Enter a rate, like 450" }} />}
      <Button onClick={() => setAttempt((n) => n + 1)}>Submit the form</Button>
    </div>
  );
}
export const FormErrors = { render: () => <ErrorsDemo /> };
