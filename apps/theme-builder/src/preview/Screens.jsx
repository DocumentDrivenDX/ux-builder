import { Button, Checkbox, StatusPill, TextField, ThemeProvider } from "@ux-builder/ui";
import { AppShell, ChartFrame, CollectionList, Dashboard, FilterSection, FormPage, ListDetail, RecordDetail, StatTile } from "@ux-builder/ui/patterns";
import { Conversation } from "@ux-builder/ui/assistant";
import { tokensFor } from "./Preview.jsx";

/* The SDK's screen patterns, previewed in a palette × design system cell
   (FEAT-003 BB-18, US-032): each screen twice, at a phone width and a desktop
   width, scaled down to fit. Patterns lay out by the width they are given,
   and the shell is told to as well (adapt="container"), so both frames show
   their real layout in one window. Sample content only: nothing is fetched. */

export const SCREENS = [["widgets", "Widgets"], ["collection", "Collection list"], ["list-detail", "List with detail"], ["form", "Form"], ["dashboard", "Dashboard"], ["assistant", "Assistant"]];

const NAV = [
  { id: "home", label: "Home", href: "#home", icon: "home" },
  { id: "matters", label: "Matters", href: "#matters", icon: "view" },
  { id: "clients", label: "Clients", href: "#clients", icon: "user" },
  { id: "reports", label: "Reports", href: "#reports", icon: "download" },
  { id: "settings", label: "Settings", href: "#settings", icon: "settings" },
];
const MATTERS = [
  { id: "0412", name: "Halvorsen v. Atlas", client: "Halvorsen", owner: "R. Lee", value: "£42,100" },
  { id: "0413", name: "Mercer v. Oakline", client: "Mercer", owner: "S. Patel", value: "£18,600" },
  { id: "0414", name: "Vale Holdings", client: "Vale", owner: "R. Lee", value: "£7,250" },
  { id: "0415", name: "Ortiz v. Brightwater", client: "Ortiz", owner: "A. Chen", value: "£63,900" },
];
const COLUMNS = [
  { key: "name", label: "Matter", priority: true },
  { key: "client", label: "Client", priority: true },
  { key: "owner", label: "Owner" },
  { key: "value", label: "Value", numeric: true },
];
const none = () => {};

/* The Assistant screen (FEAT-007 BLD-01, US-046-AC10): a conversation with a tool call, cited sources and an approval. */
export const ASSISTANT = [
  { id: "u1", role: "user", text: "Draft a bill for Acme v Beta for October" },
  { id: "a1", role: "assistant", parts: [
    { type: "tool", id: "t1", name: "lookup_time", title: "Looked up time entries", status: "done", input: { matter: "Acme v Beta" }, output: { hours: 27.5 } },
    { type: "text", text: "October has **27.5 hours** [1] at the agreed £450 an hour [2]: £12,400." },
    { type: "sources", sources: [{ id: "s1", title: "Time entries, October", href: "https://example.com/time" }, { id: "s2", title: "Engagement letter" }] },
    { type: "approval", id: "ap1", action: "create-bill", summary: "Create bill B-1044 for Acme v Beta, £12,400?" },
  ] },
];

function Screen({ id }) {
  if (id === "collection") {
    return <CollectionList title="Matters" actions={<Button size="sm">New matter</Button>} columns={COLUMNS} rows={MATTERS}
      search="" onSearchChange={none} filters={[{ id: "open", label: "Status: Open" }]} onRemoveFilter={none} onClearFilters={none}
      filterPanel={<FilterSection title="Status"><Checkbox label="Open" defaultChecked /></FilterSection>}
      selectable selected={["0413"]} onSelectedChange={none} bulkActions={<Button size="sm" variant="secondary">Assign</Button>}
      page={1} pageSize={4} total={48} onPageChange={none} />;
  }
  if (id === "list-detail") {
    return <ListDetail items={MATTERS.map((m) => ({ id: m.id, label: m.name }))} selected="0412" onSelect={none} listLabel="Matters"
      detail={<RecordDetail title="Halvorsen v. Atlas" statusPill={<StatusPill state="live" />} actions={<Button size="sm">Edit</Button>}
        fields={[{ label: "Client", value: "Halvorsen" }, { label: "Owner", value: "R. Lee" }, { label: "Opened", value: "3 Mar 2026" }, { label: "Value", value: "£42,100" }]}
        tabs={[{ id: "overview", label: "Overview", panel: <p>Two entries need review.</p> }, { id: "documents", label: "Documents", count: 12, panel: null }]} tabsParam="preview-tab" />} />;
  }
  if (id === "assistant") {
    return <div className="tb-screen__assistant"><Conversation messages={ASSISTANT} onSend={none} onDecide={none} suggestions={["When is the hearing?"]} /></div>;
  }
  if (id === "form") {
    return <FormPage title="New matter" onCancel={none}>
      <TextField label="Client" defaultValue="Halvorsen" />
      <TextField label="Matter name" error="Enter the matter name" />
      <TextField label="Reference" hint="Optional" />
    </FormPage>;
  }
  return <Dashboard title="Billing overview" tiles={[
    <StatTile key="a" label="Unbilled time" value="£412k" change={{ direction: "up", amount: "8%", comparison: "on August" }} />,
    <StatTile key="b" label="Billed" value="£381k" change={{ direction: "flat", comparison: "on August" }} />,
    <StatTile key="c" label="Collected" value="£350k" />,
    <StatTile key="d" label="Aged debt" value="£96k" />,
  ]} charts={[<ChartFrame key="x" title="Billed by month" legend={[{ label: "Billed" }]}><div className="tb-screen__chart" /></ChartFrame>]} />;
}

/* One screen in one option × design system × appearance, at both widths. */
export function ScreenPreview({ screen, option, ds, appearance, brandTitle }) {
  return (
    <ThemeProvider tokens={tokensFor(option, ds, appearance)} appearance={appearance} className="tb-screen" data-preview={`${option.label}:${ds.name}:${appearance}:${screen}`}>
      <div className="tb-preview__head"><b>{brandTitle}</b><span>{appearance}</span></div>
      <div className="tb-screen__frames">
        {[["phone", "Phone"], ["desktop", "Desktop"]].map(([w, label]) => (
          <figure key={w} className={`tb-screen__frame tb-screen__frame--${w}`} aria-label={`${label} width`} inert>
            <AppShell adapt="container" nav={NAV} current="matters" brand={<b>{brandTitle}</b>}>
              <div className="tb-screen__page"><Screen id={screen} /></div>
            </AppShell>
          </figure>
        ))}
      </div>
    </ThemeProvider>
  );
}
