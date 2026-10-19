import { PrimaryNav } from "./Navigation.jsx";
import { DescriptionList, TabsSection, Timeline } from "./Record.jsx";

/* The parts of a record screen, and the main navigation (US-026, US-024). */
export default { title: "Patterns/Record parts", parameters: { layout: "padded" } };

export const Fields = { render: () => <DescriptionList items={[{ label: "Client", value: "Acme" }, { label: "Partner", value: "R. Lee" }, { label: "Opened", value: "2 October 2026" }, { label: "Summary", value: "Commercial dispute over a supply contract.", wide: true }]} /> };
export const Activity = { render: () => <Timeline locale="en-GB" events={[
  { id: "a", kind: "system", actor: "Import", action: "created the matter", time: "2026-10-01T09:00:00Z" },
  { id: "c", kind: "change", actor: "S. Patel", action: "changed status to Open", time: "2026-10-02T11:00:00Z" },
  { id: "b", kind: "comment", actor: "R. Lee", action: "commented", time: "2026-10-03T14:30:00Z", body: "Called the client." },
]} /> };
export const Sections = { render: () => <TabsSection label="Matter" param="story-tab" tabs={[{ id: "overview", label: "Overview", panel: <p>Overview of the matter.</p> }, { id: "documents", label: "Documents", count: 12, panel: <p>Twelve documents.</p> }, { id: "billing", label: "Billing", panel: <p>Billing.</p> }]} /> };
export const MainNavigation = { render: () => <PrimaryNav current="matters" items={["Home", "Matters", "Clients", "Reports", "Settings"].map((label, i) => ({ id: label.toLowerCase(), label, href: "#", icon: ["home", "view", "user", "download", "settings"][i] }))} /> };
