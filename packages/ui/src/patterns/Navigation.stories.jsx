import { Breadcrumbs } from "../widgets/Breadcrumbs.jsx";
import { MenuButton } from "../widgets/MenuButton.jsx";
import { ErrorScreen } from "./ErrorScreen.jsx";
import { Page } from "./Layout.jsx";
import { AppShell, WorkspaceSwitcher } from "./Navigation.jsx";

/* The app shell (US-024). Resize the window: a bottom bar and drawer below
   600px, a rail to 840px, then the design system's side navigation. */
export default { title: "Patterns/App shell", component: AppShell, parameters: { layout: "fullscreen" } };

const NAV = [
  { id: "home", label: "Home", href: "#home", icon: "home" },
  { id: "matters", label: "Matters", href: "#matters", icon: "view" },
  { id: "billing", label: "Billing", icon: "copy", items: [{ id: "invoices", label: "Invoices", href: "#invoices" }, { id: "rates", label: "Rates", href: "#rates" }] },
  { id: "clients", label: "Clients", href: "#clients", icon: "user" },
  { id: "reports", label: "Reports", href: "#reports", icon: "download" },
  { id: "settings", label: "Settings", href: "#settings", icon: "settings" },
];
const SPACES = ["London", "New York", "Paris", "Tokyo", "Sydney", "Chicago", "Boston", "Hong Kong"].map((label, i) => ({ id: `w${i}`, label }));

export const Shell = {
  render: () => (
    <AppShell nav={NAV} current="matters" brand={<strong>Acme Legal</strong>}
      actions={<><WorkspaceSwitcher workspaces={SPACES} current="w0" /><MenuButton label="Account" variant="text" align="end" items={[{ label: "Profile" }, { label: "Sign out" }]} /></>}
      breadcrumbs={<Breadcrumbs items={[{ label: "Clients", href: "#clients" }, { label: "Acme", href: "#acme" }, { label: "Matters" }]} />}>
      <Page><h1>Matters</h1><p>Content scrolls between the bars.</p></Page>
    </AppShell>
  ),
};
export const NotFound = { render: () => <ErrorScreen kind="not-found" /> };
