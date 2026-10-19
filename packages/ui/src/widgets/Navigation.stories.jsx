import { useState } from "react";
import { Breadcrumbs } from "./Breadcrumbs.jsx";
import { Button } from "./Button.jsx";
import { MenuButton } from "./MenuButton.jsx";
import { Sheet } from "./Sheet.jsx";
import { Tabs } from "./Tabs.jsx";

/* The navigation widgets (FEAT-004 SDK-19). */
export default { title: "UI Components/Navigation", component: MenuButton, tags: ["autodocs"] };

export const Menu = {
  render: () => <MenuButton label="Account" items={[{ label: "Profile" }, { label: "Preferences" }, { label: "Archived", disabled: true }, { label: "Sign out" }]} />,
};
export const Trail = {
  render: () => <Breadcrumbs items={[{ label: "Clients", href: "#clients" }, { label: "Acme", href: "#acme" }, { label: "Matters" }]} />,
};
export const MatterTabs = {
  render: () => <Tabs label="Matter" tabs={[{ id: "overview", label: "Overview", panel: <p>Overview</p> }, { id: "documents", label: "Documents", count: 12, panel: <p>Documents</p> }, { id: "billing", label: "Billing", panel: <p>Billing</p> }]} />,
};
function SheetDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Filters</Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Filters" side="end"><p>Filter controls go here.</p></Sheet>
    </>
  );
}
export const SideSheet = { render: () => <SheetDemo /> };
