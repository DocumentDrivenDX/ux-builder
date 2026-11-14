import { useState } from "react";
import { themes as THEMES } from "@ux-builder/tokens/manifest.json";
import {
  AppearanceSwitch, Breadcrumbs, Button, Card, Checkbox, ChoicePicker, Combobox, DataTable, DatePicker, DateRangePicker,
  Icon, Logo, MenuButton, Notice, Pagination, ProgressBar, RadioGroup, Select, Sheet, Skeleton, Spinner, StatusPill,
  Switch, TextArea, TextField, ThemeProvider, ToastProvider, Tooltip, useToast,
} from "@ux-builder/ui";
import {
  AppShell, ChartFrame, Cluster, ConfirmDialog, Dashboard, DescriptionList, ErrorSummary, FilterBar, Page, Stack, StatePanel,
  StatTile, TabsSection, Timeline,
} from "@ux-builder/ui/patterns";

/* The theme showcase: a data-pipelines workspace, one screen, built only from
   the SDK's widgets and patterns and styled only with --piq-* role tokens, so
   every theme dresses it fully. The theme menu in the top bar switches it.
   Only the Pipelines screen exists; other destinations say so when chosen. */

const DEFAULT_THEME = "vk-databricks";
const known = (name) => THEMES.some((t) => t.name === name);
const initialTheme = () => {
  const asked = new URLSearchParams(location.search).get("theme");
  return asked && known(asked) ? asked : DEFAULT_THEME;
};

const NAV = [
  { id: "home", label: "Home", href: "#home", icon: "home" },
  { id: "pipelines", label: "Pipelines", href: "#pipelines", icon: "refresh" },
  { id: "datasets", label: "Datasets", href: "#datasets", icon: "view" },
  { id: "reports", label: "Reports", href: "#reports", icon: "download" },
  { id: "settings", label: "Settings", href: "#settings", icon: "settings" },
];

/* Run outcomes, shown with the StatusPill tone that carries the same meaning:
   red only for a failure. */
const OUTCOME = {
  succeeded: { state: "live", label: "Succeeded" },
  slow: { state: "limited", label: "Running slow" },
  review: { state: "evaluation", label: "Waiting for review" },
  failed: { state: "closed", label: "Failed" },
};
const RUNS = [
  { id: "run-4821", pipeline: "Orders ingest", owner: "M. Reyes", minutes: 4.2, rows: 1240000, outcome: "succeeded" },
  { id: "run-4820", pipeline: "Customer 360 merge", owner: "J. Lindqvist", minutes: 11.8, rows: 312000, outcome: "review" },
  { id: "run-4819", pipeline: "Clickstream sessionise", owner: "A. Byrne", minutes: 26.5, rows: 8900000, outcome: "slow" },
  { id: "run-4818", pipeline: "Finance close extract", owner: "R. Okafor", minutes: 2.1, rows: 48000, outcome: "failed" },
  { id: "run-4817", pipeline: "Inventory snapshot", owner: "M. Reyes", minutes: 6.7, rows: 620000, outcome: "succeeded" },
  { id: "run-4816", pipeline: "Orders ingest", owner: "M. Reyes", minutes: 4.0, rows: 1190000, outcome: "succeeded" },
];
const number = new Intl.NumberFormat("en-GB");
const COLUMNS = [
  { key: "id", label: "Run", render: (r) => <code className="sc-mono">{r.id}</code> },
  { key: "pipeline", label: "Pipeline", sortable: true },
  { key: "owner", label: "Owner", sortable: true },
  { key: "minutes", label: "Duration (min)", numeric: true, sortable: true, render: (r) => r.minutes.toFixed(1) },
  { key: "rows", label: "Rows written", numeric: true, sortable: true, render: (r) => number.format(r.rows) },
  { key: "outcome", label: "Outcome", render: (r) => <StatusPill state={OUTCOME[r.outcome].state}>{OUTCOME[r.outcome].label}</StatusPill> },
];

const WEEK = [
  { day: "Mon", ok: 42, failed: 3 }, { day: "Tue", ok: 47, failed: 1 }, { day: "Wed", ok: 39, failed: 5 },
  { day: "Thu", ok: 51, failed: 2 }, { day: "Fri", ok: 45, failed: 0 }, { day: "Sat", ok: 18, failed: 1 }, { day: "Sun", ok: 21, failed: 0 },
];
const PEAK = 60;   // the value axis runs from 0 to 60 runs

const CLUSTERS = [
  { value: "shared-xl", label: "Shared XL (autoscale 2–16)" },
  { value: "shared-l", label: "Shared Large (autoscale 2–8)" },
  { value: "jobs-m", label: "Jobs Medium" },
  { value: "jobs-s", label: "Jobs Small" },
  { value: "serverless", label: "Serverless" },
];
const OWNERS = [
  { value: "any", label: "Anyone" }, { value: "M. Reyes", label: "M. Reyes" }, { value: "J. Lindqvist", label: "J. Lindqvist" },
  { value: "A. Byrne", label: "A. Byrne" }, { value: "R. Okafor", label: "R. Okafor" },
];
const REGIONS = ["us-east-1", "us-west-2", "eu-west-1", "eu-central-1", "ap-southeast-2"].map((r) => ({ value: r, label: r }));
const PERIODS = { today: "today", "7d": "7 days", "30d": "30 days" };
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function RunsChart() {
  return (
    <ChartFrame
      title="Runs this week"
      description="Runs per day across every pipeline, on a scale from 0 to 60. Failed runs are hatched and counted above each bar."
      legend={[
        { label: "Succeeded", marker: <span className="sc-swatch sc-swatch--ok" aria-hidden="true" /> },
        { label: "Failed (hatched)", marker: <span className="sc-swatch sc-swatch--failed" aria-hidden="true" /> },
      ]}
      table={{ columns: [{ key: "day", label: "Day" }, { key: "ok", label: "Succeeded", numeric: true }, { key: "failed", label: "Failed", numeric: true }], rows: WEEK }}
    >
      <div className="sc-chart" aria-hidden="true">
        <div className="sc-axis"><span>60</span><span>30</span><span>0</span></div>
        <div className="sc-bars">
          {WEEK.map((d) => (
            <div key={d.day} className="sc-bars__col">
              <span className="sc-bars__value">{d.ok + d.failed}{d.failed ? ` (${d.failed}✕)` : ""}</span>
              <div className="sc-bars__track">
                <div className="sc-bars__stack" style={{ blockSize: `${((d.ok + d.failed) / PEAK) * 100}%` }}>
                  <span className="sc-bars__seg sc-bars__seg--failed" style={{ flexGrow: d.failed }} />
                  <span className="sc-bars__seg sc-bars__seg--ok" style={{ flexGrow: d.ok }} />
                </div>
              </div>
              <span className="sc-bars__label">{d.day}</span>
            </div>
          ))}
        </div>
      </div>
    </ChartFrame>
  );
}

function RunsPanel({ say }) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState([{ id: "owner", label: "Owner: M. Reyes", owner: "M. Reyes" }]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftOwner, setDraftOwner] = useState("M. Reyes");
  const [onlyFailed, setOnlyFailed] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const q = norm(query);
  const owner = filters.find((f) => f.owner)?.owner;
  const failedOnly = filters.some((f) => f.id === "failed");
  const shown = RUNS.filter((r) => (!q || norm(`${r.pipeline} ${r.owner} ${r.id}`).includes(q))
    && (!owner || r.owner === owner) && (!failedOnly || r.outcome === "failed"));
  const attention = shown.filter((r) => r.outcome === "slow" || r.outcome === "review");
  const clearAll = () => { setFilters([]); setQuery(""); };
  const table = (rows) => rows.length
    ? <DataTable caption="Recent runs" columns={COLUMNS} rows={rows} pageSize={10} initialSort={{ key: "minutes", dir: "descending" }} />
    : <StatePanel kind="no-results" title={query ? `No runs match “${query}”` : "No runs match these filters"} filters={filters} onClearFilters={clearAll} clearLabel="Clear search and filters">
        <p>Check the spelling, or search by pipeline, owner or run ID.</p>
      </StatePanel>;
  const apply = () => {
    setFilters([
      ...(draftOwner !== "any" ? [{ id: "owner", label: `Owner: ${draftOwner}`, owner: draftOwner }] : []),
      ...(onlyFailed ? [{ id: "failed", label: "Failed runs only" }] : []),
    ]);
    setFiltersOpen(false);
  };

  return (
    <Card title="Recent runs" actions={
      <MenuButton label="Export" variant="secondary" align="start" items={[
        { label: "Export as CSV", onSelect: () => say(`Exported ${shown.length} runs as CSV.`) },
        { label: "Export as Parquet", onSelect: () => say(`Exported ${shown.length} runs as Parquet.`) },
      ]} />
    }>
      <Stack gap={4}>
        <FilterBar
          search={query} onSearchChange={setQuery} searchLabel="Search runs by pipeline, owner or run ID"
          filters={filters} onRemoveFilter={(f) => setFilters((all) => all.filter((x) => x.id !== f.id))} onClearAll={() => setFilters([])}
          onOpenFilters={() => setFiltersOpen(true)} filtersOpen={filtersOpen}
        />
        <p className="sc-small" role="status">{shown.length === 1 ? "1 run shown" : `${shown.length} runs shown`}</p>
        <TabsSection
          label="Runs by outcome" param="runs"
          tabs={[
            { id: "all", label: "All", count: shown.length, panel: table(shown) },
            { id: "attention", label: "Needs attention", count: attention.length, panel: table(attention) },
            { id: "scheduled", label: "Scheduled", count: 0, panel: (
              <StatePanel kind="empty" title="Nothing is scheduled in the next hour"
                action={<Button variant="secondary" onClick={() => say("Orders ingest will run at the top of the hour.")}>Schedule a run</Button>}>
                <p>Runs scheduled for the next hour appear here, with their cluster and start time.</p>
              </StatePanel>
            ) },
          ]}
        />
        <Pagination page={page} pageSize={pageSize} total={shown.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </Stack>
      <Sheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filter runs" side="end">
        <Stack gap={4}>
          <Checkbox label="Failed runs only" checked={onlyFailed} onChange={(e) => setOnlyFailed(e.target.checked)} />
          <Select label="Owner" options={OWNERS} value={draftOwner} onChange={(e) => setDraftOwner(e.target.value)} />
          <Cluster gap={2}><Button variant="text" onClick={() => setFiltersOpen(false)}>Cancel</Button><Button variant="secondary" onClick={apply}>Apply filters</Button></Cluster>
        </Stack>
      </Sheet>
    </Card>
  );
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function ScheduleForm({ onDelete }) {
  const [cluster, setCluster] = useState("shared-xl");
  const [region, setRegion] = useState("eu-west-1");
  const [start, setStart] = useState("2026-11-09");
  const [window, setWindow] = useState({ from: "2026-11-01", to: "2026-11-30" });
  const [cadence, setCadence] = useState("daily");
  const [mode, setMode] = useState("incremental");
  const [email, setEmail] = useState("data-team@");
  const [errors, setErrors] = useState({});
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState("");
  const idOf = (n) => `sc-schedule-${n}`;

  const save = (e) => {
    e.preventDefault();
    const found = EMAIL.test(email) ? {} : { email: "Enter the alert email in full, like data-team@example.com" };
    setErrors(found);
    setAttempt((a) => a + 1);
    setSaved("");
    if (Object.keys(found).length) return;
    setSaving(true);
    setTimeout(() => { setSaving(false); setSaved("Schedule saved. It applies from the next run."); }, 1200);
  };

  return (
    <Card as="form" title="Orders ingest schedule" onSubmit={save} noValidate aria-label="Orders ingest schedule">
      <Stack gap={4}>
        <ErrorSummary errors={errors} idOf={idOf} attempt={attempt} title="The schedule was not saved" />
        <p className="sc-body">Changes apply from the next run. Every field is required unless it says optional.</p>
        <TextField id={idOf("name")} label="Pipeline name" defaultValue="Orders ingest" hint="Shown in alerts and the run history." />
        <ChoicePicker label="Cadence" options={[{ value: "hourly", label: "Hourly" }, { value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }]} value={cadence} onChange={setCadence} />
        <Select label="Cluster" options={CLUSTERS} value={cluster} onChange={(e) => setCluster(e.target.value)} />
        <Combobox label="Region" options={REGIONS} value={region} onChange={setRegion} />
        <DatePicker label="First run" value={start} onChange={setStart} hint="Runs at 02:00 UTC." />
        <DateRangePicker label="Backfill window (optional)" from={window.from} to={window.to} onChange={setWindow} />
        <RadioGroup label="Load mode" name="mode" value={mode} onChange={setMode} options={[
          { value: "incremental", label: "Incremental" }, { value: "full", label: "Full refresh" },
          { value: "cdc", label: "Change data capture (this source has no change feed)", disabled: true },
        ]} />
        <TextField id={idOf("email")} label="Alert email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} hint="Save the schedule to check it." />
        <TextArea label="Notes for on-call (optional)" rows={3} defaultValue="Retry once on a transient source error; page on the second failure." />
        <Checkbox label="Pause the pipeline when the source schema changes" defaultChecked />
        <Cluster gap={2}><Button variant="secondary" type="submit" busy={saving}>Save schedule</Button></Cluster>
        <p className="sc-body" role="status">{saved}</p>
        <hr className="sc-rule" />
        <Cluster gap={2} justify="space-between">
          <p className="sc-small">Deleting stops the schedule and removes the run history.</p>
          <Button variant="text" onClick={onDelete}><Icon name="delete" /> Delete pipeline…</Button>
        </Cluster>
      </Stack>
    </Card>
  );
}

function RunDetail({ say }) {
  const [watch, setWatch] = useState(true);
  return (
    <Card title="Run run-4819">
      <Stack gap={4}>
        <Cluster gap={2}><p className="sc-eyebrow">Clickstream sessionise</p><StatusPill state="limited">Running slow</StatusPill></Cluster>
        <ProgressBar label="Writing partitions" value={68} max={100} showValue />
        <Switch label="Alert me when this run finishes" checked={watch} onChange={(e) => { setWatch(e.target.checked); say(e.target.checked ? "You will be alerted when run-4819 finishes." : "Alerts for run-4819 are off."); }} />
        <DescriptionList items={[
          { label: "Started", value: "4 Nov 2026, 09:12 UTC" },
          { label: "Cluster", value: "Shared XL" },
          { label: "Source", value: <code className="sc-mono">s3://events/raw/2026/11/04</code> },
          { label: "Target", value: <code className="sc-mono">main.analytics.sessions</code> },
          { label: "Summary", value: "Throughput dropped after a source partition arrived late; the run is catching up.", wide: true },
        ]} />
        <Timeline locale="en-GB" label="Run activity" events={[
          { id: "a", kind: "system", actor: "Scheduler", action: "started the run", time: "2026-11-04T09:12:00Z" },
          { id: "b", kind: "change", actor: "A. Byrne", action: "raised the cluster to 16 workers", time: "2026-11-04T09:31:00Z" },
          { id: "c", kind: "comment", actor: "M. Reyes", action: "commented", time: "2026-11-04T09:40:00Z", body: "The late partition has landed; keep it running." },
        ]} />
      </Stack>
    </Card>
  );
}

function Lineage() {
  return (
    <Card title="Lineage">
      <Stack gap={3}>
        <Spinner size="sm" label="Loading lineage" showLabel />
        <Cluster gap={3} align="start">
          <Skeleton variant="circle" width={40} />
          <div className="sc-grow"><Skeleton lines={3} /></div>
        </Cluster>
        <Skeleton variant="rect" height={72} />
      </Stack>
    </Card>
  );
}

function Workspace({ theme, setTheme, appearance, setAppearance }) {
  const { show } = useToast();
  const say = (message) => show({ message });
  const [confirm, setConfirm] = useState(false);
  const [period, setPeriod] = useState("7d");
  const current = THEMES.find((t) => t.name === theme);

  const actions = (
    <Cluster gap={2} className="sc-tools">
      <Select label="Theme" className="sc-theme" options={THEMES.map((t) => ({ value: t.name, label: t.name }))} value={theme} onChange={(e) => setTheme(e.target.value)} />
      <AppearanceSwitch value={appearance} onChange={setAppearance} available={current?.appearances} />
      <Tooltip content="Help for this screen"><Button variant="text" aria-label="Help" onClick={() => say("Help: each pipeline’s runs, schedule and lineage are on this screen.")}><Icon name="help" /></Button></Tooltip>
      <MenuButton icon="user" buttonLabel="Account" variant="text" align="end" items={[
        { label: "Open profile", onSelect: () => say("Profile is not part of this showcase.") },
        { label: "Manage access tokens", onSelect: () => say("Access tokens are not part of this showcase.") },
        { label: "Sign out", onSelect: () => say("Sign-out is not part of this showcase.") },
      ]} />
    </Cluster>
  );

  return (
    <AppShell nav={NAV} current="pipelines" navLabel="Workspace" brand={<Logo size="md" />} actions={actions}
      onNavigate={(item) => { if (item.id !== "pipelines") say(`${item.label} is not part of this showcase; only Pipelines is.`); }}
      breadcrumbs={<Breadcrumbs items={[{ label: "Home", href: "#home" }, { label: "Analytics workspace", href: "#ws" }, { label: "Pipelines" }]} onNavigate={(item) => say(`${item.label} is not part of this showcase.`)} />}>
      <Page>
        <Stack gap={6}>
          <Dashboard
            title="Pipelines"
            actions={<>
              <MenuButton icon="more" buttonLabel="More actions" variant="text" align="end" items={[
                { label: "Import pipelines from a file", onSelect: () => say("Import is not part of this showcase.") },
                { label: "Duplicate this workspace", onSelect: () => say("Duplicated as “Analytics workspace (copy)”.") },
              ]} />
              <Button variant="secondary" badge={3} onClick={() => say("Started the 3 queued runs.")}>Start queued runs</Button>
              <Button onClick={() => show({ message: "Created pipeline “Untitled 1”.", actionLabel: "Undo", onAction: () => say("Removed “Untitled 1”.") })}>Create pipeline</Button>
            </>}
            filters={<ChoicePicker label="Period" options={[{ value: "today", label: "Today" }, { value: "7d", label: "7 days" }, { value: "30d", label: "30 days" }]} value={period} onChange={setPeriod} />}
            refreshedAt="2026-11-04T09:45:00Z" locale="en-GB"
            tiles={[
              <section key="rate" className="sc-spotlight" aria-labelledby="sc-rate">
                <p id="sc-rate" className="sc-eyebrow">Success rate, {PERIODS[period]}</p>
                <p className="sc-display">98.6%</p>
                <p className="sc-body">Up from 97.1% the period before. The target is 99%.</p>
              </section>,
              <StatTile key="runs" label="Runs today" value="214" change={{ direction: "up", amount: "12%", comparison: "on yesterday" }} />,
              <StatTile key="rows" label="Rows written today" value="38.2 million" change={{ direction: "flat", comparison: "on yesterday" }} />,
              <StatTile key="failed" label="Failed runs today" value="3" change={{ direction: "down", amount: "2", comparison: "on yesterday" }} />,
            ]}
            charts={[
              <RunsChart key="runs" />,
              <ChartFrame key="spend" title="Spend by cluster" description="Compute spend this month, by cluster." status="loading" />,
            ]}
          />
          <Stack gap={3}>
            <Notice tone="warning" title="Two runs need attention">Clickstream sessionise is running slow and Customer 360 merge is waiting for a review.</Notice>
            <Notice tone="info" title="Maintenance on Saturday">Shared clusters restart between 02:00 and 02:30 UTC; scheduled runs move to 02:45 UTC.</Notice>
          </Stack>

          <div className="sc-columns">
            <Stack gap={6} as="section" aria-labelledby="sc-runs" className="sc-main">
              <h2 id="sc-runs" className="sc-h2">Runs</h2>
              <RunsPanel say={say} />
              <section aria-labelledby="sc-about" className="sc-section">
                <h2 id="sc-about" className="sc-h2">About this workspace</h2>
                <p className="sc-lead">Pipelines here load the company’s operational data into the lakehouse every night, so the morning’s dashboards start from yesterday’s numbers.</p>
                <p className="sc-body">Each pipeline belongs to one owner, who is paged when a run fails twice. Runs keep their logs for 30 days; the run history keeps a summary of every run for a year. To change who is paged, edit the pipeline’s schedule; to change what it reads, open it from the Recent runs table.</p>
                <p className="sc-small">Last edited by M. Reyes on 2 November 2026. Workspace ID <code className="sc-mono">ws-7c1e-04</code>.</p>
              </section>
            </Stack>
            <Stack gap={6} as="section" aria-labelledby="sc-selected" className="sc-side">
              <h2 id="sc-selected" className="sc-h2">Selected run and pipeline</h2>
              <RunDetail say={say} />
              <ScheduleForm onDelete={() => setConfirm(true)} />
              <Lineage />
            </Stack>
          </div>
        </Stack>
      </Page>
      <ConfirmDialog
        open={confirm} onCancel={() => setConfirm(false)}
        onConfirm={() => { setConfirm(false); show({ message: "Deleted pipeline “Orders ingest”.", actionLabel: "Undo", onAction: () => say("Restored “Orders ingest”.") }); }}
        title="Delete this pipeline?" objectName="Orders ingest" consequence="Its schedule stops and its run history is removed. The tables it wrote stay."
        confirmLabel="Delete pipeline"
      />
    </AppShell>
  );
}

export function Showcase() {
  const [theme, setThemeState] = useState(initialTheme);
  const [appearance, setAppearance] = useState("system");
  const setTheme = (t) => {
    setThemeState(t);
    const url = new URL(location.href);
    url.searchParams.set("theme", t);
    history.replaceState(null, "", url);
  };
  // The provider also answers the audit's piq:set-theme event; keep the menu in step with it.
  const onChange = ({ theme: t, appearance: a }) => { if (t && t !== theme) setThemeState(t); if (a) setAppearance(a); };

  return (
    <ThemeProvider theme={theme} appearance={appearance} onChange={onChange} className="sc-root">
      <ToastProvider>
        <Workspace theme={theme} setTheme={setTheme} appearance={appearance} setAppearance={setAppearance} />
      </ToastProvider>
    </ThemeProvider>
  );
}
