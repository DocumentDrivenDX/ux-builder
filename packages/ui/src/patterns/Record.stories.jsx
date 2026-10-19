import { useState } from "react";
import { Button } from "../widgets/Button.jsx";
import { ListDetail, RecordDetail } from "./Record.jsx";

/* A record beside its list (US-026). Resize: the list and record side by
   side from 840px; below, the list, then the record's own view with Back. */
export default { title: "Patterns/Record", component: RecordDetail, parameters: { layout: "padded" } };

const ITEMS = ["Acme v. Beta", "Globex v. Initech", "Hooli v. Pied Piper", "Umbrella v. Wayne"].map((label, i) => ({ id: `r${i}`, label }));
const ACTIVITY = [
  { id: 1, kind: "system", actor: "Import", action: "created the matter", time: "2026-10-01T09:00:00Z" },
  { id: 2, kind: "change", actor: "S. Patel", action: "changed status to Open", time: "2026-10-02T11:00:00Z" },
  { id: 3, kind: "comment", actor: "R. Lee", action: "commented", time: "2026-10-03T14:30:00Z", body: "Called the client." },
];
const detail = (item) => (
  <RecordDetail title={item?.label} status={item ? "ready" : "empty"} statusPill={<span>Open</span>} actions={<Button>Edit</Button>} overflow={[{ label: "Archive" }]}
    fields={[{ label: "Client", value: "Acme" }, { label: "Owner", value: "R. Lee" }, { label: "Opened", value: "1 Oct 2026" }, { label: "Summary", value: "Contract dispute over delivery terms.", wide: true }]}
    tabs={[{ id: "overview", label: "Overview", panel: <p>Overview</p> }, { id: "documents", label: "Documents", count: 12, panel: <p>Documents</p> }]}
    activity={ACTIVITY} />
);
function Demo() {
  const [selected, setSelected] = useState("r0");
  return <ListDetail items={ITEMS} selected={selected} onSelect={setSelected} listLabel="Matters" detail={detail(ITEMS.find((i) => i.id === selected))} />;
}
export const ListWithDetail = { render: () => <Demo /> };
export const Record = { render: () => detail(ITEMS[0]) };
