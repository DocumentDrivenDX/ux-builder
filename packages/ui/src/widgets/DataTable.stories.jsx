import { DataTable } from "./DataTable.jsx";
import { StatusPill } from "./StatusPill.jsx";

export default {
  title: "UI Components/DataTable",
  component: DataTable,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "Sorts on the headers marked sortable (aria-sort says which way) and pages at pageSize." } } },
};

const ROWS = [
  { id: 1, matter: "Halvorsen v. Atlas", partner: "M. Reyes", hours: 12.4, state: "live" },
  { id: 2, matter: "Brightwater merger", partner: "J. Lindqvist", hours: 3.1, state: "evaluation" },
  { id: 3, matter: "Okafor estate", partner: "R. Okafor", hours: 7.75, state: "limited" },
  { id: 4, matter: "Northgate lease", partner: "M. Reyes", hours: 0.8, state: "closed" },
  { id: 5, matter: "Kestrel Biotech licence", partner: "A. Byrne", hours: 21.0, state: "purchasing" },
  { id: 6, matter: "Marlow arbitration", partner: "J. Lindqvist", hours: 5.5, state: "live" },
  { id: 7, matter: "Ferris refinancing", partner: "A. Byrne", hours: 9.2, state: "limited" },
];
const COLUMNS = [
  { key: "matter", label: "Matter", sortable: true },
  { key: "partner", label: "Partner", sortable: true },
  { key: "hours", label: "Hours", numeric: true, sortable: true },
  { key: "state", label: "Status", render: (r) => <StatusPill state={r.state} /> },
];

export const Matters = { args: { columns: COLUMNS, rows: ROWS, pageSize: 5, caption: "Matters", initialSort: { key: "hours", dir: "descending" } } };
