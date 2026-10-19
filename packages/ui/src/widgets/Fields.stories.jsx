import { useState } from "react";
import { Checkbox, RadioGroup, Switch } from "./Choice.jsx";
import { Select, TextArea, TextField } from "./Field.jsx";

export default { title: "UI Components/Fields", tags: ["autodocs"] };

const MATTERS = [
  { value: "2026-0412", label: "2026-0412 · Halvorsen v. Atlas" },
  { value: "2026-0388", label: "2026-0388 · Brightwater merger" },
  { value: "2025-1170", label: "2025-1170 · Northgate lease", disabled: true },
];

export const Text = { render: () => <TextField label="Matter number" defaultValue="2026-0412" hint="As it appears on the engagement letter." /> };
export const Placeholder = { render: () => <TextField label="Client" placeholder="Search clients" /> };
export const Invalid = {
  render: function Invalid() {
    const [v, setV] = useState("0.08");
    const tenths = /^\d+(\.\d)?$/.test(v);
    return <TextField label="Hours" value={v} onChange={(e) => setV(e.target.value)} error={tenths ? undefined : "Bill in tenths of an hour."} />;
  },
};
export const Disabled = { render: () => <TextField label="Timekeeper" defaultValue="R. Okafor" disabled /> };
export const MultiLine = { render: () => <TextArea label="Narrative" defaultValue="Reviewed and revised draft purchase agreement." /> };
export const Dropdown = {
  parameters: { docs: { description: { story: "In Chrome 135 and later the open list takes the theme too (appearance: base-select); elsewhere it is the platform's list." } } },
  render: () => <Select label="Matter" options={MATTERS} placeholder="Choose a matter" defaultValue="" hint="Closed matters cannot be chosen." />,
};
export const Checkboxes = {
  render: () => (
    <div style={{ display: "flex", gap: 16 }}>
      <Checkbox label="Block-billed" defaultChecked />
      <Checkbox label="No-charge" />
      <Checkbox label="Locked" disabled />
    </div>
  ),
};
export const Radios = {
  render: function Radios() {
    const [v, setV] = useState("hourly");
    return <RadioGroup label="Bill as" value={v} onChange={setV} options={[{ value: "hourly", label: "Hourly" }, { value: "fixed", label: "Fixed fee" }, { value: "pro", label: "Pro bono", disabled: true }]} />;
  },
};
export const Switches = {
  render: () => (
    <div style={{ display: "flex", gap: 16 }}>
      <Switch label="Notify partner" defaultChecked />
      <Switch label="Hold" />
      <Switch label="Locked" disabled />
    </div>
  ),
};
