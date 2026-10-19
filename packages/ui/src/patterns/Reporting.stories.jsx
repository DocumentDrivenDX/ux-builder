import { DateRangePicker } from "../widgets/DatePicker.jsx";
import { Select } from "../widgets/Field.jsx";
import { ChartFrame, Dashboard, ReportViewer, StatTile } from "./Reporting.jsx";

/* Dashboards and reports (US-028). The chart area is the app's: any chart
   library, drawn with role tokens; the frame adds the rest. */
export default { title: "Patterns/Reporting", component: Dashboard, parameters: { layout: "padded" } };

const TABLE = { columns: [{ key: "m", label: "Month" }, { key: "v", label: "Billed (£k)", numeric: true }], rows: [{ m: "Jul", v: 380 }, { m: "Aug", v: 381 }, { m: "Sep", v: 412 }] };
const placeholder = <div style={{ blockSize: "10rem", background: "var(--piq-color-surface-sunken)" }} role="img" aria-label="Billed by month: July 380, August 381, September 412" />;

export const Overview = {
  render: () => (
    <Dashboard title="Billing overview" refreshedAt={new Date()}
      filters={<Select label="Office" options={[{ value: "ldn", label: "London" }, { value: "nyc", label: "New York" }]} />}
      dateRange={<DateRangePicker label="Period" from="2026-09-01" to="2026-09-30" />}
      tiles={[
        <StatTile key="a" label="Unbilled time" value="£412k" change={{ direction: "up", amount: "8%", comparison: "on August" }} />,
        <StatTile key="b" label="Billed" value="£381k" change={{ direction: "flat", comparison: "on August" }} />,
        <StatTile key="c" label="Collected" value="£350k" change={{ direction: "down", amount: "2%", comparison: "on August" }} />,
        <StatTile key="d" label="Aged debt" value="£96k" />,
      ]}
      charts={[
        <ChartFrame key="x" title="Billed by month" legend={[{ label: "Billed" }]} table={TABLE}>{placeholder}</ChartFrame>,
        <ChartFrame key="y" title="By office" status="error" onRetry={() => {}} />,
      ]} />
  ),
};
export const Report = {
  render: () => (
    <ReportViewer title="Aged debt" parameters={<Select label="Office" options={[{ value: "ldn", label: "London" }]} />} onRun={() => {}} onExport={() => {}}
      applied={[{ label: "Office", value: "London" }, { label: "As at", value: "30 Sep 2026" }]}
      results={<table className="piq-table"><thead><tr><th>Client</th><th className="piq-num">Over 90 days</th></tr></thead><tbody><tr><td>Acme</td><td className="piq-num">£12,400</td></tr></tbody></table>} />
  ),
};
