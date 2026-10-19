/* A list with detail for the record browser test (US-026-AC4): rendered by
   React in the page, inside a box the test resizes. Bundled by
   record.browser.test.mjs. */
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { Button } from "../../dist/index.js";
import { ListDetail, RecordDetail } from "../../dist/patterns.js";

const ITEMS = ["Acme v. Beta", "Globex v. Initech", "Hooli v. Pied Piper"].map((label, i) => ({ id: `r${i}`, label }));

function App() {
  const [selected, setSelected] = useState("r0");
  const item = ITEMS.find((i) => i.id === selected);
  return (
    <ListDetail items={ITEMS} selected={selected} onSelect={setSelected} listLabel="Matters"
      detail={<RecordDetail title={item?.label} status={item ? "ready" : "empty"} actions={<Button id="edit">Edit</Button>}
        fields={[{ label: "Client", value: "Acme" }, { label: "Owner", value: "R. Lee" }]} />} />
  );
}
createRoot(document.getElementById("root")).render(<App />);
