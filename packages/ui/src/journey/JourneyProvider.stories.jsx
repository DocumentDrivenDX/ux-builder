import { useState } from "react";
import { Button } from "../widgets/Button.jsx";
import { Card } from "../widgets/Card.jsx";
import { StatePanel } from "../patterns/Regions.jsx";
import { JourneyProvider, useJourneyStep } from "./Journey.jsx";

export default {
  title: "Foundations/JourneyProvider",
  component: JourneyProvider,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Hands the app's own sink each journey event: journey-start, step, complete, abandon, error-shown, empty-result and no-results-search, each with journey, screen and step IDs and a timestamp, never user content. Mark a step with useJourneyStep(journeyId, step); StatePanel reports its error, empty and no-results states. Without a sink nothing is emitted; the SDK sends nothing anywhere (ADR-038). This story's sink writes the events below.",
      },
    },
  },
};

function Find({ onOpen, panel }) {
  useJourneyStep("J-find", 1, { screen: "map" });
  return (
    <Card title="Rivers near you" actions={<Button onClick={onOpen}>Open the Elk</Button>}>
      {panel ? <StatePanel kind={panel} /> : "Three rivers within an hour."}
    </Card>
  );
}
function River({ onBack }) {
  const journey = useJourneyStep("J-find", 2, { screen: "detail" });
  return (
    <Card title="The Elk" actions={<><Button onClick={() => journey.complete()}>Save river</Button><Button variant="secondary" onClick={onBack}>Back</Button></>}>
      Public access at the bridge.
    </Card>
  );
}

function Journey() {
  const [events, setEvents] = useState([]);
  const [at, setAt] = useState("map");
  const [panel, setPanel] = useState(null);
  return (
    <div style={{ display: "grid", gap: "var(--piq-space-4)", padding: "var(--piq-space-5)", background: "var(--piq-color-ground)", color: "var(--piq-color-text)", maxWidth: "36rem" }}>
      <JourneyProvider sink={(e) => setEvents((xs) => [...xs, e])}>
        {at === "map" ? <Find onOpen={() => setAt("detail")} panel={panel} /> : <River onBack={() => setAt("map")} />}
      </JourneyProvider>
      <div style={{ display: "flex", gap: "var(--piq-space-2)", flexWrap: "wrap" }}>
        <Button variant="secondary" onClick={() => { setAt("map"); setPanel("no-results"); }}>Show no results</Button>
        <Button variant="secondary" onClick={() => setEvents([])}>Clear the log</Button>
      </div>
      <ol aria-label="Events the sink received" style={{ margin: 0, font: "var(--piq-font-size-small) ui-monospace, monospace" }}>
        {events.map((e, i) => <li key={i}>{e.type} · {e.journey} · step {e.step} · {e.screen}</li>)}
      </ol>
    </div>
  );
}

export const Events = { render: () => <Journey /> };
